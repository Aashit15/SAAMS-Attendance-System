import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { faceService } from '../../services/services';

const STEPS = ['Look Straight', 'Turn Slightly Left', 'Turn Slightly Right', 'Tilt Up', 'Tilt Down'];

export default function FaceRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = location.state?.userId;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [descriptors, setDescriptors] = useState([]);
  const [faceImage, setFaceImage] = useState(null);
  const [status, setStatus] = useState('loading'); // loading, ready, capturing, done, submitting, error
  const [error, setError] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        setModelLoadProgress(10);
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        setModelLoadProgress(40);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelLoadProgress(70);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelLoadProgress(100);
        setModelsLoaded(true);
        setStatus('ready');
      } catch (err) {
        setError('Failed to load face detection models. Make sure model files are in /public/models/');
        setStatus('error');
      }
    };
    loadModels();
  }, []);

  // Start webcam
  useEffect(() => {
    if (!modelsLoaded) return;
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setError('Camera access denied. Please allow camera access.');
        setStatus('error');
      }
    };
    startVideo();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [modelsLoaded]);

  // Real-time face detection overlay
  useEffect(() => {
    if (!modelsLoaded || status === 'done' || status === 'submitting') return;
    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detection) {
        setFaceDetected(true);
        const box = detection.detection.box;
        ctx.strokeStyle = detection.detection.score > 0.85 ? '#10b981' : '#f59e0b';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText(`${(detection.detection.score * 100).toFixed(0)}% confidence`, box.x, box.y - 8);
      } else {
        setFaceDetected(false);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [modelsLoaded, status]);

  const captureDescriptor = useCallback(async () => {
    if (!videoRef.current) return;
    setStatus('capturing');
    try {
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      if (!detection) { setError('No face detected. Please position your face clearly.'); setStatus('ready'); return; }
      if (detection.detection.score < 0.85) { setError('Low confidence. Please improve lighting.'); setStatus('ready'); return; }

      const descriptor = Array.from(detection.descriptor);
      const newDescriptors = [...descriptors, descriptor];
      setDescriptors(newDescriptors);

      // Save first frame as reference image
      if (newDescriptors.length === 1) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoRef.current.videoWidth;
        tempCanvas.height = videoRef.current.videoHeight;
        tempCanvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        setFaceImage(tempCanvas.toDataURL('image/jpeg', 0.8));
      }

      if (newDescriptors.length < 5) {
        setCurrentStep(newDescriptors.length);
        setStatus('ready');
        setError('');
      } else {
        setStatus('done');
        setError('');
      }
    } catch (err) {
      setError('Face detection failed. Please try again.');
      setStatus('ready');
    }
  }, [descriptors]);

  const handleSubmit = async () => {
    if (descriptors.length !== 5) return;
    setStatus('submitting');
    setError('');
    try {
      await faceService.registerFace({ userId, faceDescriptors: descriptors, faceImage });
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      navigate('/login', { state: { message: 'Face registered! You can now log in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Face registration failed');
      setStatus('done');
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-400 mb-4">No user ID found. Please register first.</p>
          <a href="/register" className="text-primary-400 hover:underline">Go to Register</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold gradient-text">Face Registration</h1>
          <p className="mt-2 text-surface-200/60">Complete 5 captures from different angles</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6 px-4">
          {STEPS.map((step, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${i < descriptors.length ? 'gradient-accent' : i === currentStep ? 'bg-primary-500 animate-pulse' : 'bg-surface-700/50'}`} />
              <p className={`text-xs mt-1 text-center ${i === currentStep ? 'text-primary-300' : 'text-surface-200/30'}`}>{step}</p>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-6 shadow-2xl">
          {/* Model loading */}
          {!modelsLoaded && status !== 'error' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-surface-200/70">Loading face detection models...</p>
              <div className="w-48 h-2 bg-surface-800 rounded-full mx-auto mt-4">
                <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${modelLoadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Webcam */}
          {modelsLoaded && (
            <div className="relative rounded-xl overflow-hidden bg-surface-900">
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl mirror" style={{ transform: 'scaleX(-1)' }} />
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" style={{ transform: 'scaleX(-1)' }} />

              {/* Face detection indicator */}
              <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-medium ${faceDetected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {faceDetected ? '✓ Face Detected' : '✕ No Face'}
              </div>

              {/* Current step instruction */}
              {status === 'ready' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 glass rounded-xl text-sm font-medium text-primary-300">
                  {STEPS[currentStep]}
                </div>
              )}
            </div>
          )}

          {error && <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          {/* Capture / Submit buttons */}
          <div className="mt-6 flex gap-4 justify-center">
            {status === 'ready' && (
              <button onClick={captureDescriptor} disabled={!faceDetected}
                className="px-8 py-3 gradient-primary rounded-xl text-white font-semibold hover:opacity-90 transition-all disabled:opacity-30 shadow-lg shadow-primary-500/20">
                📸 Capture ({descriptors.length + 1}/5)
              </button>
            )}
            {status === 'capturing' && (
              <div className="flex items-center gap-2 text-primary-300">
                <span className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />Processing...
              </div>
            )}
            {status === 'done' && (
              <button onClick={handleSubmit}
                className="px-8 py-3 gradient-accent rounded-xl text-white font-semibold hover:opacity-90 transition-all shadow-lg shadow-accent-500/20">
                ✓ Complete Registration
              </button>
            )}
            {status === 'submitting' && (
              <div className="flex items-center gap-2 text-accent-400">
                <span className="w-5 h-5 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />Registering face...
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-surface-200/30">
            {descriptors.length}/5 captures completed
          </p>
        </div>
      </div>
    </div>
  );
}
