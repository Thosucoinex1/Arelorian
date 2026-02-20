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
        """Test health endpoint returns Axioms"""
        success, response = self.run_test(
            "Health Endpoint - Axioms Check",
            "GET",
            "api/health",
            200
        )
        if success and isinstance(response, dict):
            has_axioms = 'axioms' in response
            print(f"   Has axioms: {has_axioms}")
            if has_axioms:
                print(f"   Axioms: {response['axioms']}")
            return success and has_axioms
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