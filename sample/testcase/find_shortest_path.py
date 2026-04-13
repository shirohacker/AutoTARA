import sys
from pathlib import Path

current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from malsim.mal_simulator import MalSimulator
from malsim.scenario.scenario import Scenario
from malsim.policies.utils.path_finding import get_shortest_path_to

def main():
    scenario_path = current_dir / "GT01_scenario.yml"
    
    if not scenario_path.exists():
        print(f"Error: Scenario file not found at {scenario_path}")
        return

    print(f"Loading scenario from: {scenario_path}")
    
    try:
        scenario = Scenario.load_from_file(str(scenario_path))
    except Exception as e:
        print(f"Failed to load scenario: {e}")
        return

    # Initialize Simulator with TTC Calculation enabled
    print("Initializing MalSimulator...")
    sim = MalSimulator.from_scenario(scenario)
    
    # Attacker Information
    attacker_name = "Attacker"
    
    if attacker_name not in sim.agent_states:
        print(f"Error: Attacker '{attacker_name}' not found in the scenario.")
        print(f"Available agents: {list(sim.agent_states.keys())}")
        return

    agent_state = sim.agent_states[attacker_name]
    attack_graph = sim.sim_state.attack_graph
    
    # Get Entry Points (Already compromised nodes)
    entry_nodes = list(agent_state.performed_nodes)
    if not entry_nodes:
        print("Warning: No entry points (compromised nodes) found for the attacker.")
    else:
        print(f"Entry Nodes: {[n.full_name for n in entry_nodes]}")

    # Get Goals
    goals = agent_state.settings.goals
    if not goals:
        print("Error: No goals defined for the attacker.")
        return

    # For this example, we'll find the path to the first goal
    # In a real scenario, you might want to iterate over all goals or pick a specific one
    target_goal = list(goals)[0]
    print(f"Target Goal: {target_goal.full_name}")

    # Calculate TTC values for the graph
    # This creates a dictionary of TTC costs for each node
    print("Using calculated TTC values from simulator state...")
    ttc_values = sim.sim_state.graph_state.ttc_values
    if not ttc_values:
        print("Error: TTC values are empty. Set sim_settings.ttc_mode to EXPECTED_VALUE or PRE_SAMPLE in scenario.yml.")
        return

    # Find Shortest Path
    print(f"Calculating shortest path to {target_goal.full_name}...")
    try:
        path = get_shortest_path_to(
            attack_graph,
            entry_nodes,
            target_goal,
            ttc_values
        )
        
        if path:
            print("\n" + "="*30)
            print("SHORTEST ATTACK PATH")
            print("="*30)
            print(f"Start: {[n.full_name for n in entry_nodes]}")
            print(f"Goal:  {target_goal.full_name}")
            print("-" * 30)
            
            total_ttc = 0
            for i, node in enumerate(path):
                cost = ttc_values.get(node, 0)
                total_ttc += cost
                # print(f"Step {i+1}: {node.full_name} (Cost: {cost})")
                print(f"Step {i+1}: {node.full_name}")
            
            print("-" * 30)
            print(f"Total Path Cost (TTC): {total_ttc}")
            print("="*30)
        else:
            print("\nNo path found to the target goal.")
            
    except Exception as e:
        print(f"An error occurred while finding the path: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
