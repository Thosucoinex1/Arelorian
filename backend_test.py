import requests
import json
import sys
from datetime import datetime

class OuroborosAPITester:
    def __init__(self, base_url="https://agent-mmorpg.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_notary_id = None
        self.test_agent_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else type(response_data)}")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "expected_status": expected_status,
                    "actual_status": response.status_code,
                    "error": response.text[:200]
                })
                return False, response.text

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "error": str(e)
            })
            return False, str(e)

    def test_health_endpoint(self):
        """Test health endpoint shows PostgreSQL Duden-Register"""
        success, response = self.run_test(
            "Health Endpoint - PostgreSQL Duden-Register",
            "GET",
            "api/health",
            200
        )
        if success and isinstance(response, dict):
            has_axioms = 'axioms' in response
            database = response.get('database', '')
            service = response.get('service', '')
            print(f"   Service: {service}")
            print(f"   Database: {database}")
            print(f"   Has axioms: {has_axioms}")
            
            # Check for PostgreSQL Duden-Register
            is_postgres = 'PostgreSQL Duden-Register' in database
            is_v2 = 'v2.0' in service
            print(f"   PostgreSQL Duden-Register: {is_postgres}")
            print(f"   Version 2.0: {is_v2}")
            
            return success and has_axioms and is_postgres and is_v2
        return False

    def test_world_grid_full(self):
        """Test world grid returns 35x35 grid data"""
        success, response = self.run_test(
            "World Grid - 35x35 Full Grid",
            "GET",
            "api/grid",
            200
        )
        if success and isinstance(response, dict):
            has_grid = 'grid' in response
            if has_grid:
                grid = response['grid']
                print(f"   Grid cells: {len(grid)}")
                # Should be 35x35 = 1225 cells
                expected_cells = 35 * 35
                is_full_grid = len(grid) == expected_cells
                print(f"   Expected {expected_cells} cells, got {len(grid)}: {is_full_grid}")
                
                # Check for required fields
                if grid:
                    cell = grid[0]
                    required_fields = ['x', 'z', 'cell_type', 'biome', 'stability_index', 'corruption_level']
                    has_fields = all(field in cell for field in required_fields)
                    print(f"   Grid cells have required fields: {has_fields}")
                    return success and is_full_grid and has_fields
            return success and has_grid
        return False

    def test_sanctuary_cell(self):
        """Test grid cell /api/grid/0/0 returns SANCTUARY with 100% stability"""
        success, response = self.run_test(
            "Sanctuary Cell - Grid 0,0",
            "GET",
            "api/grid/0/0",
            200
        )
        if success and isinstance(response, dict):
            cell_type = response.get('cell_type', '')
            stability = response.get('stability_index', 0)
            print(f"   Cell type: {cell_type}")
            print(f"   Stability: {stability}")
            
            is_sanctuary = cell_type == 'SANCTUARY'
            is_stable = stability == 1.0
            print(f"   Is SANCTUARY: {is_sanctuary}")
            print(f"   100% stable: {is_stable}")
            
            return success and is_sanctuary and is_stable
        return False

    def test_grid_stabilize(self):
        """Test grid stabilize endpoint reduces corruption"""
        # First get a cell that might have corruption
        success, response = self.run_test(
            "Grid Stabilize - Get Cell 5,5",
            "GET",
            "api/grid/5/5",
            200
        )
        
        if not success:
            return False
            
        original_corruption = response.get('corruption_level', 0)
        original_stability = response.get('stability_index', 1)
        
        # Now stabilize it
        success, response = self.run_test(
            "Grid Stabilize - Stabilize Cell 5,5",
            "POST",
            "api/grid/5/5/stabilize",
            200
        )
        
        if success and isinstance(response, dict):
            new_stability = response.get('stability_index', 0)
            new_corruption = response.get('corruption_level', 1)
            
            print(f"   Original - Stability: {original_stability:.3f}, Corruption: {original_corruption:.3f}")
            print(f"   After stabilize - Stability: {new_stability:.3f}, Corruption: {new_corruption:.3f}")
            
            stability_improved = new_stability >= original_stability
            corruption_reduced = new_corruption <= original_corruption
            print(f"   Stability improved/maintained: {stability_improved}")
            print(f"   Corruption reduced/maintained: {corruption_reduced}")
            
            return success and stability_improved and corruption_reduced
        return False

    def test_notary_creation_tier1(self):
        """Test notary creation with Tier 1 (Autosave)"""
        test_user_id = f"test_user_{int(datetime.now().timestamp())}"
        
        notary_data = {
            "user_id": test_user_id,
            "email": f"{test_user_id}@test.com"
        }
        
        success, response = self.run_test(
            "Notary Creation - Tier 1 Autosave",
            "POST",
            "api/notaries",
            200,
            data=notary_data
        )
        
        if success and isinstance(response, dict):
            tier = response.get('tier', 0)
            tier_name = response.get('tier_name', '')
            user_id = response.get('user_id', '')
            
            print(f"   User ID: {user_id}")
            print(f"   Tier: {tier}")
            print(f"   Tier name: {tier_name}")
            
            is_tier1 = tier == 1
            is_autosave = tier_name == 'Autosave'
            print(f"   Is Tier 1: {is_tier1}")
            print(f"   Is Autosave: {is_autosave}")
            
            if is_tier1 and is_autosave:
                self.test_notary_id = test_user_id
            
            return success and is_tier1 and is_autosave
        return False

    def test_notary_upgrade_tier2(self):
        """Test notary upgrade to Tier 2 (Duden-Entry)"""
        if not self.test_notary_id:
            print("⏭️  Skipping Tier 2 upgrade - no notary ID")
            return False
            
        success, response = self.run_test(
            "Notary Upgrade - Tier 2 Duden-Entry",
            "POST",
            f"api/notaries/{self.test_notary_id}/upgrade",
            200
        )
        
        if success and isinstance(response, dict):
            new_tier = response.get('new_tier', 0)
            tier_name = response.get('tier_name', '')
            
            print(f"   New tier: {new_tier}")
            print(f"   Tier name: {tier_name}")
            
            is_tier2 = new_tier == 2
            is_duden_entry = tier_name == 'Duden-Entry'
            print(f"   Is Tier 2: {is_tier2}")
            print(f"   Is Duden-Entry: {is_duden_entry}")
            
            return success and is_tier2 and is_duden_entry
        return False

    def test_notary_upgrade_tier3(self):
        """Test notary upgrade to Tier 3 with Universal Key reveal"""
        if not self.test_notary_id:
            print("⏭️  Skipping Tier 3 upgrade - no notary ID")
            return False
            
        success, response = self.run_test(
            "Notary Upgrade - Tier 3 Universal Key",
            "POST",
            f"api/notaries/{self.test_notary_id}/upgrade",
            200
        )
        
        if success and isinstance(response, dict):
            new_tier = response.get('new_tier', 0)
            tier_name = response.get('tier_name', '')
            universal_key = response.get('universal_key', None)
            
            print(f"   New tier: {new_tier}")
            print(f"   Tier name: {tier_name}")
            print(f"   Universal key revealed: {universal_key is not None}")
            
            if universal_key:
                print(f"   Universal key: {universal_key[:20]}...")
            
            is_tier3 = new_tier == 3
            is_universal_key = tier_name == 'Universal Key'
            has_key = universal_key is not None
            
            return success and is_tier3 and is_universal_key and has_key
        return False

    def test_item_sets(self):
        """Test Item Sets endpoint returns Dragonscale, Voidweaver, Axiom Guardian"""
        success, response = self.run_test(
            "Item Sets - All Three Sets",
            "GET",
            "api/items/sets",
            200
        )
        
        if success and isinstance(response, dict):
            sets = response.get('sets', {})
            required_sets = ['Dragonscale', 'Voidweaver', 'Axiom Guardian']
            
            print(f"   Available sets: {list(sets.keys())}")
            
            has_all_sets = all(set_name in sets for set_name in required_sets)
            print(f"   Has all required sets: {has_all_sets}")
            
            # Check set structure
            if has_all_sets:
                dragonscale = sets['Dragonscale']
                has_items = 'items' in dragonscale
                has_bonuses = 'bonuses' in dragonscale
                print(f"   Dragonscale has items/bonuses: {has_items}/{has_bonuses}")
                
                if has_bonuses:
                    bonuses = dragonscale['bonuses']
                    has_2piece = '2' in bonuses or 2 in bonuses
                    has_3piece = '3' in bonuses or 3 in bonuses
                    print(f"   Dragonscale has 2/3 piece bonuses: {has_2piece}/{has_3piece}")
                
                return success and has_items and has_bonuses
            
            return success and has_all_sets
        return False

    def test_give_item_to_agent(self):
        """Test giving item to agent with set_name"""
        if not self.test_agent_id:
            print("⏭️  Skipping item grant - no agent ID")
            return False
            
        item_data = {
            "name": "Dragonscale Helm",
            "item_type": "HELM",
            "subtype": "HEAVY",
            "rarity": "EPIC",
            "stats": {"defense": 25, "strength": 5},
            "set_name": "Dragonscale"
        }
        
        success, response = self.run_test(
            "Give Item - Dragonscale Set Item",
            "POST",
            f"api/agents/{self.test_agent_id}/items",
            200,
            data=item_data
        )
        
        if success and isinstance(response, dict):
            item_name = response.get('name', '')
            item_rarity = response.get('rarity', '')
            set_name = response.get('set_name', '')
            
            print(f"   Item name: {item_name}")
            print(f"   Item rarity: {item_rarity}")
            print(f"   Set name: {set_name}")
            
            correct_name = item_name == "Dragonscale Helm"
            correct_set = set_name == "Dragonscale"
            print(f"   Correct name: {correct_name}")
            print(f"   Correct set: {correct_set}")
            
            return success and correct_name and correct_set
        return False

    def test_world_state_endpoint(self):
        """Test world state endpoint"""
        success, response = self.run_test(
            "World State Endpoint",
            "GET",
            "api/world",
            200
        )
        if success and isinstance(response, dict):
            required_keys = ['agents', 'monsters', 'pois', 'chunks']
            has_all_keys = all(key in response for key in required_keys)
            print(f"   Has required keys {required_keys}: {has_all_keys}")
            if 'agents' in response:
                print(f"   Agent count: {len(response.get('agents', []))}")
            if 'monsters' in response:
                print(f"   Monster count: {len(response.get('monsters', []))}")
            if 'pois' in response:
                print(f"   POI count: {len(response.get('pois', []))}")
            if 'chunks' in response:
                print(f"   Chunk count: {len(response.get('chunks', []))}")
            return success and has_all_keys
        return False

    def test_agents_endpoint(self):
        """Test agents endpoint"""
        success, response = self.run_test(
            "Agents Endpoint",
            "GET", 
            "api/agents",
            200
        )
        if success and isinstance(response, dict):
            has_agents = 'agents' in response
            print(f"   Has agents field: {has_agents}")
            if has_agents:
                agents = response['agents']
                print(f"   Agent count: {len(agents)}")
                if agents and len(agents) > 0:
                    first_agent = agents[0]
                    required_fields = ['id', 'name', 'position', 'state', 'faction']
                    has_required_fields = all(field in first_agent for field in required_fields)
                    print(f"   First agent has required fields: {has_required_fields}")
                    return success and has_required_fields
            return success and has_agents
        return False

    def test_character_import(self):
        """Test character import endpoint"""
        test_character_data = {
            "name": "Test Character",
            "description": "A test character for import functionality",
            "personality": {
                "primary": "Wise",
                "sociability": 0.8,
                "aggression": 0.2
            },
            "stats": {
                "str": 12,
                "agi": 10,
                "int": 15,
                "vit": 10
            }
        }
        
        import_request = {
            "json_data": json.dumps(test_character_data),
            "source": "test"
        }
        
        success, response = self.run_test(
            "Character Import",
            "POST",
            "api/agents/import",
            200,
            data=import_request
        )
        
        if success and isinstance(response, dict):
            has_success = response.get('success', False)
            has_agent = 'agent' in response
            print(f"   Import success: {has_success}")
            print(f"   Has agent data: {has_agent}")
            if has_agent:
                agent = response['agent']
                print(f"   Imported agent name: {agent.get('name', 'Unknown')}")
                print(f"   Imported agent ID: {agent.get('id', 'Unknown')}")
                return success and has_success and has_agent, agent.get('id')
        return False, None

    def test_agent_decision(self, agent_id):
        """Test agent decision endpoint"""
        if not agent_id:
            print("⏭️  Skipping agent decision test - no agent ID")
            return False
        
        success, response = self.run_test(
            "Agent Decision Trigger",
            "POST",
            f"api/agents/{agent_id}/decision",
            200,
            timeout=45  # Give more time for AI processing
        )
        
        if success and isinstance(response, dict):
            required_keys = ['decision', 'justification', 'new_state']
            has_required = all(key in response for key in required_keys)
            print(f"   Has required decision keys: {has_required}")
            if has_required:
                print(f"   Decision: {response['decision']}")
                print(f"   Justification: {response['justification'][:100]}...")
                print(f"   New state: {response['new_state']}")
            return success and has_required
        return False

    def test_chat_endpoint(self):
        """Test chat message posting and retrieval"""
        # Test posting a message
        chat_message = {
            "sender_id": "test_user",
            "sender_name": "Test User",
            "content": "Test message from backend test",
            "channel": "GLOBAL"
        }
        
        success, response = self.run_test(
            "Chat Message Post",
            "POST",
            "api/chat",
            200,
            data=chat_message
        )
        
        if not success:
            return False
        
        # Test retrieving messages
        success, response = self.run_test(
            "Chat Messages Retrieval",
            "GET",
            "api/chat?limit=10",
            200
        )
        
        if success and isinstance(response, dict):
            has_messages = 'messages' in response
            print(f"   Has messages field: {has_messages}")
            if has_messages:
                messages = response['messages']
                print(f"   Message count: {len(messages)}")
                return True
        return False

    def test_websocket_endpoint(self):
        """Test WebSocket endpoint connection"""
        print(f"\n🔍 Testing WebSocket Connection...")
        try:
            import websocket
            
            ws_url = self.base_url.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws'
            print(f"   WebSocket URL: {ws_url}")
            
            def on_message(ws, message):
                print("   ✅ WebSocket message received")
                data = json.loads(message)
                print(f"   Message type: {data.get('type', 'unknown')}")
                ws.close()
            
            def on_error(ws, error):
                print(f"   ❌ WebSocket error: {error}")
            
            def on_close(ws, close_status_code, close_msg):
                print("   🔌 WebSocket closed")
            
            def on_open(ws):
                print("   ✅ WebSocket connected successfully")
                # Send a ping to test bidirectional communication
                ws.send(json.dumps({"type": "ping"}))
            
            ws = websocket.WebSocketApp(ws_url,
                                      on_open=on_open,
                                      on_message=on_message,
                                      on_error=on_error,
                                      on_close=on_close)
            
            # Run with timeout
            ws.run_forever(ping_interval=30, ping_timeout=10)
            self.tests_run += 1
            self.tests_passed += 1
            return True
            
        except ImportError:
            print("   ⚠️  WebSocket client not available, installing...")
            import subprocess
            subprocess.run([sys.executable, "-m", "pip", "install", "websocket-client"], check=True)
            return self.test_websocket_endpoint()
        except Exception as e:
            print(f"   ❌ WebSocket test failed: {str(e)}")
            self.tests_run += 1
            self.failed_tests.append({
                "test": "WebSocket Connection",
                "endpoint": "/api/ws",
                "expected_status": "CONNECTED",
                "actual_status": "ERROR",
                "error": str(e)
            })
            return False

def main():
    print("🚀 Starting Ouroboros: Neural Emergence API Tests")
    print("=" * 60)
    
    tester = OuroborosAPITester()
    agent_id = None
    
    # Test 1: Health endpoint with Axioms
    health_success = tester.test_health_endpoint()
    
    # Test 2: World state endpoint  
    world_success = tester.test_world_state_endpoint()
    
    # Test 3: Agents endpoint
    agents_success = tester.test_agents_endpoint()
    
    # Test 4: Character import
    import_success, imported_agent_id = tester.test_character_import()
    if import_success and imported_agent_id:
        agent_id = imported_agent_id
    
    # Test 5: Agent decision (if we have an agent ID)
    decision_success = tester.test_agent_decision(agent_id)
    
    # Test 6: Chat endpoint
    chat_success = tester.test_chat_endpoint()
    
    # Test 7: WebSocket connection
    websocket_success = tester.test_websocket_endpoint()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS:")
    print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed tests:")
        for fail in tester.failed_tests:
            print(f"   - {fail['test']}: {fail['endpoint']} -> {fail['actual_status']}")
            print(f"     Error: {fail['error'][:100]}")
    
    # Return exit code
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())