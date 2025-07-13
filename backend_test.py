import requests
import sys
import json
from datetime import datetime

class GameHubAPITester:
    def __init__(self, base_url="https://8582d6b4-78b4-4f84-ae45-3f34236df980.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_data = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers={k:v for k,v in headers.items() if k != 'Content-Type'})
                else:
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_public_config(self):
        """Test public configuration endpoint"""
        success, response = self.run_test(
            "Get Public Config",
            "GET",
            "config",
            200
        )
        if success:
            required_keys = ['site_title', 'site_description', 'primary_color', 'features']
            for key in required_keys:
                if key in response:
                    print(f"   ✓ Found {key}: {response[key]}")
                else:
                    print(f"   ⚠️ Missing {key}")
        return success

    def test_register(self, username, email, password):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"username": username, "email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            print(f"   ✓ Registered user: {username}")
            print(f"   ✓ Is admin: {self.user_data.get('is_admin', False)}")
            return True
        return False

    def test_login(self, username, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            return True
        return False

    def test_get_user_info(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get User Info",
            "GET",
            "auth/me",
            200
        )
        if success:
            print(f"   ✓ Username: {response.get('username')}")
            print(f"   ✓ Balance: {response.get('balance')}")
            print(f"   ✓ Is Admin: {response.get('is_admin')}")
        return success

    def test_admin_config(self):
        """Test admin configuration endpoint"""
        if not self.user_data or not self.user_data.get('is_admin'):
            print("   ⚠️ Skipping admin config test - user is not admin")
            return True
            
        success, response = self.run_test(
            "Get Admin Config",
            "GET",
            "admin/config",
            200
        )
        return success

    def test_update_admin_config(self):
        """Test updating admin configuration"""
        if not self.user_data or not self.user_data.get('is_admin'):
            print("   ⚠️ Skipping admin config update test - user is not admin")
            return True
            
        config_data = {
            "site_title": "Test Gaming Hub",
            "primary_color": "#ff0000",
            "hero_title": "Test Hero Title"
        }
        
        success, response = self.run_test(
            "Update Admin Config",
            "POST",
            "admin/config",
            200,
            data=config_data
        )
        return success

    def test_dice_game(self):
        """Test dice game functionality - should fail with insufficient balance"""
        # The dice endpoint expects query parameters, not JSON body
        # Since user starts with 0 balance, this should return 400 for insufficient balance
        success, response = self.run_test(
            "Play Dice Game (Insufficient Balance)",
            "POST",
            "games/dice/play?target=50.0&amount=10.0&over=true",
            400
        )
        
        if success:
            print(f"   ✓ Expected insufficient balance error: {response.get('detail', 'No detail')}")
        return success

    def test_admin_stats(self):
        """Test admin statistics endpoint"""
        if not self.user_data or not self.user_data.get('is_admin'):
            print("   ⚠️ Skipping admin stats test - user is not admin")
            return True
            
        success, response = self.run_test(
            "Get Admin Stats",
            "GET",
            "admin/stats",
            200
        )
        
        if success:
            print(f"   ✓ Total Users: {response.get('total_users')}")
            print(f"   ✓ Total Bets: {response.get('total_bets')}")
            print(f"   ✓ Total Wagered: {response.get('total_wagered')}")
            print(f"   ✓ House Profit: {response.get('house_profit')}")
        return success

def main():
    print("🎮 Starting GameHub Pro API Tests")
    print("=" * 50)
    
    # Setup
    tester = GameHubAPITester()
    test_user = f"testuser_{datetime.now().strftime('%H%M%S')}"
    test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
    test_password = "TestPass123!"

    # Test sequence
    tests = [
        ("Public Configuration", lambda: tester.test_public_config()),
        ("User Registration", lambda: tester.test_register(test_user, test_email, test_password)),
        ("Get User Info", lambda: tester.test_get_user_info()),
        ("Admin Configuration", lambda: tester.test_admin_config()),
        ("Update Admin Config", lambda: tester.test_update_admin_config()),
        ("Dice Game", lambda: tester.test_dice_game()),
        ("Admin Statistics", lambda: tester.test_admin_stats()),
    ]

    # Run all tests
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        try:
            success = test_func()
            if not success:
                print(f"❌ {test_name} failed")
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())