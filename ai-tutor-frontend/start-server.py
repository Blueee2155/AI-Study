"""Start frontend static server with SPA support"""
import http.server
import socketserver
import os
from pathlib import Path

# Change to dist directory
os.chdir(os.path.join(os.path.dirname(__file__), 'dist'))

PORT = 3000

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler that serves index.html for all routes (SPA support)"""
    
    def do_GET(self):
        # Try to serve the requested file
        try:
            super().do_GET()
        except FileNotFoundError:
            # If file not found, serve index.html for SPA routing
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            with open('index.html', 'rb') as f:
                self.wfile.write(f.read())
    
    def translate_path(self, path):
        """Override to handle SPA routes"""
        # Get the default path
        path = super().translate_path(path)
        # If it's a file, return it
        if os.path.isfile(path):
            return path
        # Otherwise, return index.html for SPA routing
        return os.path.join(os.getcwd(), 'index.html')

with socketserver.TCPServer(("0.0.0.0", PORT), SPAHandler) as httpd:
    print(f"Serving at port {PORT}")
    print(f"Open http://localhost:{PORT} in your browser")
    print(f"SPA routing enabled - all routes will serve index.html")
    httpd.serve_forever()
