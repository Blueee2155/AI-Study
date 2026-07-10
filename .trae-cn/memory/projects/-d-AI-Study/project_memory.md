## Hard Constraints
- Backend must be started using `start-all.bat` or `start-backend.bat` to ensure proper environment setup
- CORS configuration in `app/config.py` must have `CORS_ORIGINS` set to `["*"]` and `allow_credentials` set to `False` in `app/main.py` to avoid browser request blocking
- Only the largest main face frame should be displayed; multiple face frames are not allowed
- Face frame must be centered on the face
- Eye frames should be drawn within the main face frame
- Face detection must handle close proximity scenarios by relaxing large face area constraints and implementing eye position-based face frame inference
- Eye detection must support both glasses-wearing and non-glasses-wearing scenarios

## Engineering Conventions
- Critical dependencies must be explicitly listed in `ai-tutor-backend/requirements.txt` to prevent missing package issues
- Backend vision detection follows a priority mechanism: YOLOv8 face model first, OpenCV face detection as fallback
- Eye detection follows a priority mechanism: YOLOv8 eye model first, OpenCV eye detection as fallback
- Eye detection is performed only within the main face frame

## Lessons Learned
- Backend startup failures (due to naming conflicts or missing dependencies) can manifest as frontend 'network errors' despite correct CORS configuration
- Using web images for training leads to unreliable detection due to copyright and annotation quality issues; public datasets like WIDER FACE, WFLW, MRL Eye, and GazeCapture are recommended instead