from typing import Annotated, List, Dict, Any
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from cf_api import CodeforcesAPI
import json

# Define the state
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    user_handle: str
    gemini_key: str

# Initialize CF API
cf_api = CodeforcesAPI()

# Define Tools
@tool
async def get_user_info(handle: str):
    """Get information about a Codeforces user (rank, rating, etc)."""
    try:
        return await cf_api.get_user_info(handle)
    except Exception as e:
        return f"Error fetching user info: {e}"

@tool
async def get_user_submissions(handle: str, count: int = 10):
    """Get recent submissions of a Codeforces user."""
    try:
        return await cf_api.get_user_status(handle, count=count)
    except Exception as e:
        return f"Error fetching submissions: {e}"

@tool
async def get_user_rating(handle: str):
    """Get rating history of a Codeforces user."""
    try:
        return await cf_api.get_user_rating(handle)
    except Exception as e:
        return f"Error fetching rating: {e}"

@tool
async def get_contest_list(gym: bool = False):
    """Get upcoming and past contests."""
    try:
        return await cf_api.get_contest_list(gym)
    except Exception as e:
        return f"Error fetching contests: {e}"

@tool
async def get_contest_standings(contest_id: int, count: int = 5):
    """Get standings for a specific contest."""
    try:
        return await cf_api.get_contest_standings(contest_id, count=count)
    except Exception as e:
        return f"Error fetching standings: {e}"

@tool
async def get_problems(tags: str = None, limit_kb: int = 500, start_index: int = 0):
    """Get problems from the problemset, optionally filtered by tags.
    
    Args:
        tags: Semicolon-separated tags (e.g. 'dp;greedy').
        limit_kb: Approximate size limit in KB for the response (default 500).
        start_index: Index to start fetching from (for pagination).
    
    Returns:
        A dictionary containing 'problems', 'problemStatistics', and 'next_start_index'.
        If 'next_start_index' is present, use it as 'start_index' in the next call to get more data.
    """
    try:
        return await cf_api.get_problems(tags, limit_kb, start_index)
    except Exception as e:
        return f"Error fetching problems: {e}"

@tool
async def get_user_blog_entries(handle: str):
    """Get blog entries for a user."""
    try:
        return await cf_api.get_user_blog_entries(handle)
    except Exception as e:
        return f"Error fetching blog entries: {e}"

from rag import rag_system

@tool
async def search_knowledge_base(query: str):
    """Search the local knowledge base for relevant information."""
    try:
        results = rag_system.query(query)
        if not results:
            return "No relevant information found in knowledge base."
        return f"Found relevant info: {results}"
    except Exception as e:
        return f"Error searching knowledge base: {e}"

tools = [get_user_info, get_user_submissions, get_user_rating, search_knowledge_base, get_contest_list, get_contest_standings, get_problems, get_user_blog_entries]


class CFanaticAgent:
    def __init__(self):
        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(AgentState)

        # Define the agent node
        async def agent_node(state: AgentState):
            messages = state["messages"]
            gemini_key = state["gemini_key"]
            user_handle = state["user_handle"]
            
            if messages and not isinstance(messages[0], SystemMessage):
                system_msg = SystemMessage(content=f"""You are CFanatic, an AI assistant specialized in helping competitive programmers analyze their Codeforces performance.

The user's Codeforces handle is: {user_handle}

When the user asks questions about "my" performance, submissions, rating, or profile, always use the handle '{user_handle}' with the available tools.

Available tools:
- get_user_info: Get user rank, rating, and profile information
- get_user_submissions: Get recent submissions
- get_user_rating: Get rating history over time
- get_contest_list: Get list of contests
- get_contest_standings: Get standings for a contest
- get_problems: Find problems (optionally by tag) use this when user ask for problems on different topic 
[schedules fft expression parsing flows games geometry graph matchings graphs greedy hashing implementation interactive 
math matrices meet-in-the-middle number theory probabilities shortest paths sortings string suffix structures strings ternary search trees two pointers] there are all the tags you can use
- get_user_blog_entries: Get user's blog posts 
- search_knowledge_base: Search for general competitive programming knowledge

Be helpful, insightful, and provide actionable advice to improve their competitive programming skills.""")
                messages = [system_msg] + messages
            
            llm = ChatGoogleGenerativeAI(
                model="models/gemini-flash-lite-latest",
                google_api_key=gemini_key,
                temperature=0.7
            ).bind_tools(tools)
            response = await llm.ainvoke(messages)
            return {"messages": [response]}

        # Define the tool node
        tool_node = ToolNode(tools)

        # Add nodes
        workflow.add_node("agent", agent_node)
        workflow.add_node("tools", tool_node)

        # Set entry point
        workflow.set_entry_point("agent")

        # Define edges
        def should_continue(state: AgentState):
            last_message = state["messages"][-1]
            if last_message.tool_calls:
                return "tools"
            return END

        workflow.add_conditional_edges("agent", should_continue)
        workflow.add_edge("tools", "agent")

        return workflow.compile()

    async def process_message(self, message: str, user_handle: str, gemini_key: str, history: List[BaseMessage] = []):
        inputs = {
            "messages": history + [HumanMessage(content=message)],
            "user_handle": user_handle,
            "gemini_key": gemini_key
        }
        
        final_state = await self.graph.ainvoke(inputs)
        return final_state["messages"][-1].content

agent = CFanaticAgent()
