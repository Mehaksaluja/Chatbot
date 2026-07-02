from typing import TypedDict, List, Optional


class AgentState(TypedDict):
    user_query: str
    chat_history: List[dict]  # [{"role": "user"|"assistant", "content": str}, ...]
    active_sources: List[str]
    retrieved_context: List[dict]
    rewrite_count: int
    final_answer: Optional[str]
