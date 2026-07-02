from langgraph.graph import StateGraph, END

from agents.state import AgentState
from agents.nodes import (
    condense_query, route_query, retrieve_context,
    grade_and_rewrite, synthesize_answer, direct_answer,
)


def _should_retrieve(state: AgentState) -> str:
    return "route" if state.get("active_sources") else "direct"


def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("condense", condense_query)
    builder.add_node("route", route_query)
    builder.add_node("retrieve", retrieve_context)
    builder.add_node("grade", grade_and_rewrite)
    builder.add_node("synthesize", synthesize_answer)
    builder.add_node("direct", direct_answer)

    builder.set_entry_point("condense")
    builder.add_conditional_edges("condense", _should_retrieve, {
        "route":  "route",
        "direct": "direct",
    })
    builder.add_edge("route",     "retrieve")
    builder.add_edge("retrieve",  "grade")
    builder.add_edge("grade",     "synthesize")
    builder.add_edge("synthesize", END)
    builder.add_edge("direct",    END)

    return builder.compile()


graph = build_graph()
