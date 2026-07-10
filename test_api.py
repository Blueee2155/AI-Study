import urllib.request
import json
import sys

def test_health():
    print("=== 测试健康检查 API ===")
    try:
        req = urllib.request.Request('http://127.0.0.1:8000/api/health')
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"状态码: {response.status}")
            print(f"响应: {json.dumps(data, indent=2, ensure_ascii=False)}")
            return data.get("status") == "ok"
    except Exception as e:
        print(f"错误: {e}")
        return False

def test_register():
    print("\n=== 测试用户注册 ===")
    try:
        data = json.dumps({
            "username": "testuser",
            "password": "test123456",
            "email": "test@example.com"
        }).encode('utf-8')
        req = urllib.request.Request(
            'http://127.0.0.1:8000/api/auth/register',
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"状态码: {response.status}")
            print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"HTTP错误: {e.code} - {error_body}")
        if e.code == 400:
            print("用户可能已存在，尝试登录...")
            return test_login()
        return None
    except Exception as e:
        print(f"错误: {e}")
        return None

def test_login():
    print("\n=== 测试用户登录 ===")
    try:
        data = json.dumps({
            "username": "testuser",
            "password": "test123456"
        }).encode('utf-8')
        req = urllib.request.Request(
            'http://127.0.0.1:8000/api/auth/login',
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"状态码: {response.status}")
            print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return result
    except Exception as e:
        print(f"错误: {e}")
        return None

def test_chat(token):
    print("\n=== 测试聊天 API ===")
    try:
        data = json.dumps({
            "message": "1+1等于几？",
            "session_id": "test-session-001"
        }).encode('utf-8')
        req = urllib.request.Request(
            'http://127.0.0.1:8000/api/chat/send',
            data=data,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            }
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            print(f"状态码: {response.status}")
            content = response.read().decode('utf-8')
            print(f"响应: {content[:500]}...")
            return True
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = True
    
    if not test_health():
        success = False
        print("健康检查失败！")
        sys.exit(1)
    
    print("健康检查成功！")
    
    auth_result = test_register()
    if not auth_result:
        success = False
        print("注册/登录失败！")
        sys.exit(1)
    
    token = auth_result.get("access_token") or auth_result.get("token")
    if not token:
        print("未获取到token，尝试从响应中查找...")
        print(f"完整响应: {json.dumps(auth_result, indent=2, ensure_ascii=False)}")
        success = False
    else:
        print(f"获取到token: {token[:20]}...")
        if not test_chat(token):
            success = False
            print("聊天API测试失败！")
        else:
            print("聊天API测试成功！")
    
    print(f"\n=== 测试总结: {'全部通过' if success else '存在失败'} ===")
    sys.exit(0 if success else 1)
