from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser

from agents.state import AgentState
from utils.vectorstore import similarity_search

_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
_parser = StrOutputParser()

_condense_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "Given the conversation history and a follow-up question, rewrite the follow-up "
        "as a fully self-contained question that can be understood without the history.\n"
        "If the question is already self-contained, return it unchanged.\n"
        "Return ONLY the rewritten question, nothing else.",
    ),
    MessagesPlaceholder("history"),
    ("human", "Follow-up question: {query}"),
])

_route_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a query router. Given a user question, decide which sources to search.\n"
        "Reply with exactly one word — video, pdf, or both — based on what the question is about.",
    ),
    ("human", "{query}"),
])

_grade_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "Does the retrieved context directly answer the user's question?\n"
        "Reply with exactly one word: yes or no.",
    ),
    ("human", "Question: {query}\n\nContext:\n{context}"),
])

_rewrite_prompt = ChatPromptTemplate.from_messages([
    ("system", "Rewrite the search query below to be more specific and likely to retrieve better results."),
    ("human", "{query}"),
])

_synthesize_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a helpful research assistant. Answer the user's question using ONLY the provided context.\n"
        "Format your answer in clean Markdown (headings, bullet lists, **bold** where helpful).\n"
        "Always cite your sources explicitly:\n"
        "- For video content: mention the timestamp, e.g. 'at 04:12 in the video'\n"
        "- For PDF content: mention the page, e.g. 'on page 3 of the document'\n"
        "If the context is insufficient, say so clearly rather than guessing.",
    ),
    MessagesPlaceholder("history"),
    ("human", "Question: {query}\n\nContext:\n{context}"),
])


def _history_messages(state: AgentState, limit: int = 8) -> list:
    """Convert the trailing chat history into (role, content) tuples for prompts."""
    history = state.get("chat_history") or []
    return [
        ("human" if m["role"] == "user" else "ai", m["content"])
        for m in history[-limit:]
        if m.get("content")
    ]


def condense_query(state: AgentState) -> AgentState:
    """Rewrite follow-up questions as standalone so retrieval works mid-conversation."""
    history = _history_messages(state)
    if not history:
        return state

    standalone = (_condense_prompt | _llm | _parser).invoke({
        "history": history,
        "query": state["user_query"],
    }).strip()

    return {**state, "user_query": standalone or state["user_query"]}


def route_query(state: AgentState) -> AgentState:
    decision = (_route_prompt | _llm | _parser).invoke({"query": state["user_query"]}).strip().lower()

    video_sources = [s for s in state["active_sources"] if s.startswith("vid_")]
    pdf_sources = [s for s in state["active_sources"] if s.startswith("pdf_")]

    if decision == "video":
        active = video_sources or state["active_sources"]
    elif decision == "pdf":
        active = pdf_sources or state["active_sources"]
    else:
        active = state["active_sources"]

    return {**state, "active_sources": active}


def retrieve_context(state: AgentState) -> AgentState:
    print(f"[retrieve] query={state['user_query']!r}, sources={state['active_sources']}")
    results = similarity_search(state["user_query"], state["active_sources"])
    print(f"[retrieve] got {len(results)} chunks")
    return {**state, "retrieved_context": results}


def grade_and_rewrite(state: AgentState) -> AgentState:
    """Grade retrieved context; rewrite the query and retry once if context is irrelevant."""
    if state.get("rewrite_count", 0) >= 1:
        return state

    context_text = "\n".join(c["text"] for c in state["retrieved_context"])
    grade = (_grade_prompt | _llm | _parser).invoke({
        "query": state["user_query"],
        "context": context_text,
    }).strip().lower()

    if grade == "no":
        rewritten = (_rewrite_prompt | _llm | _parser).invoke({"query": state["user_query"]}).strip()
        new_results = similarity_search(rewritten, state["active_sources"])
        return {
            **state,
            "user_query": rewritten,
            "retrieved_context": new_results,
            "rewrite_count": state.get("rewrite_count", 0) + 1,
        }

    return state


def synthesize_answer(state: AgentState) -> AgentState:
    context_parts = []
    for chunk in state["retrieved_context"]:
        if chunk.get("source_type") == "video":
            ts = chunk.get("timestamp", "unknown")
            context_parts.append(f"[VIDEO at {ts}]: {chunk['text']}")
        else:
            page = chunk.get("page", "?")
            context_parts.append(f"[PDF page {page}]: {chunk['text']}")

    if not context_parts:
        print("[synthesize] WARNING: no context retrieved — returning fallback")
        return {
            **state,
            "final_answer": (
                "I couldn't find any relevant content from your uploaded sources. "
                "This may happen if the source was not indexed yet, or the question "
                "doesn't match anything in the uploaded material. "
                "Try re-uploading the source or rephrasing your question."
            ),
        }

    context = "\n\n".join(context_parts)
    print(f"[synthesize] context length={len(context)} chars, {len(context_parts)} chunks")
    answer = (_synthesize_prompt | _llm | _parser).invoke({
        "history": _history_messages(state),
        "query": state["user_query"],
        "context": context,
    })
    return {**state, "final_answer": answer}
