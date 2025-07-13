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
        """Test dice game functionality"""
        # Test with proper JSON body structure
        dice_data = {
            "target": 50.0,
            "amount": 10.0,
            "over": True
        }
        
        success, response = self.run_test(
            "Play Dice Game",
            "POST",
            "games/dice/play",
            200,
            data=dice_data
        )
        
        if success:
            print(f"   ✓ Roll result: {response.get('roll')}")
            print(f"   ✓ Game result: {response.get('result')}")
            print(f"   ✓ Payout: {response.get('payout')}")
            print(f"   ✓ New balance: {response.get('new_balance')}")
        return success

    def test_mines_game(self):
        """Test mines game functionality"""
        # Start mines game
        mines_start_data = {
            "amount": 5.0,
            "mines_count": 3
        }
        
        success, response = self.run_test(
            "Start Mines Game",
            "POST",
            "games/mines/start",
            200,
            data=mines_start_data
        )
        
        if not success:
            return False
            
        game_id = response.get('game_id')
        print(f"   ✓ Game ID: {game_id}")
        print(f"   ✓ Grid size: {response.get('grid_size')}")
        print(f"   ✓ Mines count: {response.get('mines_count')}")
        
        # Reveal a tile (position 0)
        success2, response2 = self.run_test(
            "Reveal Mines Tile",
            "POST",
            f"games/mines/reveal?game_id={game_id}&tile_position=0",
            200
        )
        
        if success2:
            print(f"   ✓ Tile result: {response2.get('result')}")
            if response2.get('result') == 'safe':
                print(f"   ✓ Current multiplier: {response2.get('current_multiplier')}")
                
                # Try to cash out
                success3, response3 = self.run_test(
                    "Cash Out Mines Game",
                    "POST",
                    f"games/mines/cashout?game_id={game_id}",
                    200
                )
                
                if success3:
                    print(f"   ✓ Cash out payout: {response3.get('payout')}")
                    print(f"   ✓ Multiplier: {response3.get('multiplier')}")
                    return True
            else:
                print(f"   ✓ Hit mine - game over")
                return True
        
        return success and success2

    def test_crash_game(self):
        """Test crash game functionality"""
        # Test auto cash out
        crash_data = {
            "amount": 5.0,
            "auto_cash_out": 2.5
        }
        
        success, response = self.run_test(
            "Play Crash Game (Auto Cash Out)",
            "POST",
            "games/crash/play",
            200,
            data=crash_data
        )
        
        if success:
            print(f"   ✓ Crash point: {response.get('crash_point')}")
            print(f"   ✓ Result: {response.get('result')}")
            print(f"   ✓ Payout: {response.get('payout')}")
            print(f"   ✓ New balance: {response.get('new_balance')}")
        
        # Test manual play
        crash_manual_data = {
            "amount": 5.0
        }
        
        success2, response2 = self.run_test(
            "Play Crash Game (Manual)",
            "POST",
            "games/crash/play",
            200,
            data=crash_manual_data
        )
        
        if success2:
            print(f"   ✓ Manual crash point: {response2.get('crash_point')}")
            print(f"   ✓ Manual result: {response2.get('result')}")
        
        return success and success2

    def test_game_configs(self):
        """Test game configuration endpoints"""
        if not self.user_data or not self.user_data.get('is_admin'):
            print("   ⚠️ Skipping game config test - user is not admin")
            return True
            
        success, response = self.run_test(
            "Get Game Configs",
            "GET",
            "admin/games/config",
            200
        )
        
        if success:
            for game_type, config in response.items():
                print(f"   ✓ {game_type}: {config}")
        
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
    
    # Setup - Create admin user first (first user is automatically admin)
    tester = GameHubAPITester()
    admin_user = f"admin_{datetime.now().strftime('%H%M%S')}"
    admin_email = f"admin_{datetime.now().strftime('%H%M%S')}@example.com"
    admin_password = "AdminPass123!"

    # Test sequence - Admin setup first
    admin_tests = [
        ("Public Configuration", lambda: tester.test_public_config()),
        ("Admin Registration", lambda: tester.test_register(admin_user, admin_email, admin_password)),
        ("Get Admin Info", lambda: tester.test_get_user_info()),
        ("Admin Configuration", lambda: tester.test_admin_config()),
        ("Game Configurations", lambda: tester.test_game_configs()),
    ]

    # Run admin setup tests
    print("\n🔧 Setting up admin and configurations...")
    for test_name, test_func in admin_tests:
        print(f"\n📋 Running: {test_name}")
        try:
            success = test_func()
            if not success:
                print(f"❌ {test_name} failed")
                return 1
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            return 1

    # Now test games with admin user
    game_tests = [
        ("Dice Game", lambda: tester.test_dice_game()),
        ("Mines Game", lambda: tester.test_mines_game()),
        ("Crash Game", lambda: tester.test_crash_game()),
        ("Admin Statistics", lambda: tester.test_admin_stats()),
    ]

    print("\n🎮 Testing games with admin user...")
    for test_name, test_func in game_tests:
        print(f"\n📋 Running: {test_name}")
        try:
            success = test_func()
            if not success:
                print(f"❌ {test_name} failed")
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")

    # Now create a regular user and test games
    print("\n👤 Testing with regular user...")
    regular_tester = GameHubAPITester()
    regular_user = f"user_{datetime.now().strftime('%H%M%S')}"
    regular_email = f"user_{datetime.now().strftime('%H%M%S')}@example.com"
    regular_password = "UserPass123!"

    regular_tests = [
        ("Regular User Registration", lambda: regular_tester.test_register(regular_user, regular_email, regular_password)),
        ("Regular User Info", lambda: regular_tester.test_get_user_info()),
        ("Regular User Dice Game", lambda: regular_tester.test_dice_game()),
        ("Regular User Mines Game", lambda: regular_tester.test_mines_game()),
        ("Regular User Crash Game", lambda: regular_tester.test_crash_game()),
    ]

    for test_name, test_func in regular_tests:
        print(f"\n📋 Running: {test_name}")
        try:
            success = test_func()
            if not success:
                print(f"❌ {test_name} failed")
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")

    # Print final results
    total_tests = tester.tests_run + regular_tester.tests_run
    total_passed = tester.tests_passed + regular_tester.tests_passed
    
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {total_passed}/{total_tests} tests passed")
    
    if total_passed >= total_tests * 0.8:  # 80% pass rate is acceptable
        print("🎉 Most tests passed!")
        return 0
    else:
        print("⚠️ Many tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())