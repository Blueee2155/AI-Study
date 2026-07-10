"""
Simple proxy server to forward frontend requests to backend
This avoids the need to recompile frontend when baseURL is not set correctly
"""
import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_PORT = 8080

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler that proxies API requests to backend and serves static files for others"""
    
    def do_GET(self):
        if self.path.startswith('/api/'):
            # Forward API request to backend
            self._proxy_request('GET')
        else:
            # Check if file exists in dist directory
            file_path = os.path.join(os.path.dirname(__file__), 'dist', self.path.lstrip('/'))
            
            # Handle directory paths (e.g., /login -> index.html)
            if not '.' in self.path.split('/')[-1]:  # No extension, likely SPA route
                self._serve_index_html()
            elif os.path.isfile(file_path):  # File exists, serve it
                self._serve_static_file(file_path)
            else:  # File doesn't exist, fallback to index.html for SPA
                self._serve_index_html()
    
    def _serve_index_html(self):
        """Serve index.html for SPA routing"""
        try:
            index_path = os.path.join(os.path.dirname(__file__), 'dist', 'index.html')
            with open(index_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
            self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(500, 'index.html not found. Please build the frontend first.')
    
    def _serve_static_file(self, file_path):
        """Serve static file with correct MIME type"""
        try:
            # Determine MIME type based on file extension
            mime_types = {
                '.js': 'application/javascript',
                '.mjs': 'application/javascript',
                '.css': 'text/css',
                '.html': 'text/html',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2',
                '.ttf': 'font/ttf',
                '.eot': 'application/vnd.ms-fontobject',
                '.wasm': 'application/wasm',
                '.data': 'application/octet-stream',
                '.binarypb': 'application/octet-stream',
            }
            
            ext = os.path.splitext(file_path)[1].lower()
            mime_type = mime_types.get(ext, 'application/octet-stream')
            
            with open(file_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Cache-Control', 'public, max-age=31536000')  # Cache static files
            self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
            self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404, f'File not found: {file_path}')
    
    def do_POST(self):
        if self.path.startswith('/api/'):
            # Forward API request to backend
            self._proxy_request('POST')
        else:
            self.send_error(404, 'Not Found')
    
    def do_DELETE(self):
        if self.path.startswith('/api/'):
            # Forward DELETE request to backend
            self._proxy_request('DELETE')
        else:
            self.send_error(404, 'Not Found')
    
    def do_PUT(self):
        if self.path.startswith('/api/'):
            # Forward PUT request to backend
            self._proxy_request('PUT')
        else:
            self.send_error(404, 'Not Found')
    
    def do_OPTIONS(self):
        if self.path.startswith('/api/'):
            # Forward CORS preflight request to backend
            self._proxy_request('OPTIONS')
        else:
            self.send_response(200)
            self.end_headers()
    
    def _proxy_request(self, method):
        """Proxy a request to the backend server"""
        try:
            # Build backend URL
            backend_path = self.path
            backend_url = BACKEND_URL + backend_path
            
            # Get request body for POST requests
            body = None
            if method == 'POST':
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
            
            # Copy headers (except Host)
            headers = {}
            for key, value in self.headers.items():
                if key.lower() != 'host':
                    headers[key] = value
            
            # Add Origin header for CORS
            headers['Origin'] = f'http://localhost:{FRONTEND_PORT}'
            
            # Create request
            req = urllib.request.Request(backend_url, data=body, headers=headers, method=method)
            
            # Send request to backend
            with urllib.request.urlopen(req, timeout=120) as response:
                # Check if this is a streaming response (SSE)
                content_type = response.headers.get('Content-Type', '')
                is_streaming = 'text/event-stream' in content_type
                
                # Send response back to client
                self.send_response(response.status)
                
                # Copy response headers
                for key, value in response.headers.items():
                    if key.lower() not in ['content-encoding', 'transfer-encoding', 'content-length']:
                        self.send_header(key, value)
                
                # Add CORS headers
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                
                # For streaming responses, add cache-control to prevent buffering
                if is_streaming:
                    self.send_header('Cache-Control', 'no-cache')
                    self.send_header('X-Accel-Buffering', 'no')
                
                self.end_headers()
                
                if is_streaming:
                    # Stream chunk by chunk for SSE
                    while True:
                        chunk = response.read(64)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        self.wfile.flush()
                else:
                    # Non-streaming: read full response
                    response_data = response.read()
                    self.wfile.write(response_data)
                
        except urllib.error.HTTPError as e:
            # Backend returned an error
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(e.read())
            
        except Exception as e:
            # Other errors
            print(f"Proxy error: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(str(e).encode())
    
    def log_message(self, format, *args):
        """Override to provide better logging"""
        print(f"[PROXY] {self.address_string()} - {format % args}")

def run_server(port=FRONTEND_PORT):
    """Run the proxy server"""
    # Change to dist directory
    os.chdir(os.path.join(os.path.dirname(__file__), 'dist'))
    
    with socketserver.TCPServer(("0.0.0.0", port), ProxyHandler) as httpd:
        print(f"🚀 Proxy server started on port {port}")
        print(f"   Frontend: http://localhost:{port}")
        print(f"   Backend:  {BACKEND_URL}")
        print(f"   All /api/* requests will be proxied to backend")
        print("=" * 60)
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()
