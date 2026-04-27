import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { attendanceService, sessionService } from '../../services/services';

export default function FaceScan() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [status, setStatus] = useState('loading'); // loading, ready, detecting, success, error
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
        setStatus('ready');
      } catch { setError('Failed to load models'); setStatus('error'); }
    };
    loadModels();
  }, []);

  // Fetch active sessions
  useEffect(() => {
    sessionService.getAll({ status: 'active' }).then(res => setSessions(res.data.data.sessions)).catch(() => {});
  }, []);

  // Start webcam
  useEffect(() => {
    if (!modelsLoaded) return;
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then(stream => { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(() => { setError('Camera access denied'); setStatus('error'); });
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [modelsLoaded]);

  // Real-time face detection
  useEffect(() => {
    if (!modelsLoaded || status === 'success') return;
    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks();
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth || 640;
      canvasRef.current.height = videoRef.current.videoHeight || 480;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (detection) {
        setFaceDetected(true);
        const box = detection.detection.box;
        ctx.strokeStyle = detection.detection.score > 0.85 ? '#10b981' : '#f59e0b';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      } else setFaceDetected(false);
    }, 200);
    return () => clearInterval(interval);
  }, [modelsLoaded, status]);

  const handleScan = async () => {
    if (!selectedSession) { setError('Select a session first'); return; }
    if (!videoRef.current) return;
    setStatus('detecting');
    try {
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      if (!detection) { setError('No face detected'); setStatus('ready'); return; }
      if (detection.detection.score < 0.85) { setError('Low confidence. Improve lighting.'); setStatus('ready'); return; }

      const descriptor = Array.from(detection.descriptor);
      const res = await attendanceService.markFace({ sessionId: selectedSession, faceDescriptor: descriptor });
      setResult(res.data);
      setStatus('success');
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    } catch (err) {
      setError(err.response?.data?.message || 'Recognition failed');
      setStatus('ready');
    }
  };

  const inputClass = "w-full px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text mb-2">Face Scan</h1>
      <p className="text-surface-200/60 mb-6">Verify your identity to mark attendance</p>

      <div className="glass rounded-2xl p-6 shadow-2xl">
        {/* Session select */}
        <div className="mb-4">
          <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)} className={inputClass}>
            <option value="">Select active session...</option>
            {sessions.map(s => <option key={s._id} value={s._id}>{s.course?.name} — {new Date(s.date).toLocaleDateString()}</option>)}
          </select>
        </div>

        {/* Webcam */}
        {modelsLoaded && status !== 'success' && (
          <div className="relative rounded-xl overflow-hidden bg-surface-900">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" style={{ transform: 'scaleX(-1)' }} />
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" style={{ transform: 'scaleX(-1)' }} />
            <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-medium ${faceDetected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {faceDetected ? '✓ Face Detected' : '✕ No Face'}
            </div>
          </div>
        )}

        {!modelsLoaded && status !== 'error' && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-surface-200/60">Loading face detection...</p>
          </div>
        )}

        {status === 'success' && result && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center text-4xl animate-float">✅</div>
            <h2 className="text-xl font-bold text-green-400">Attendance Marked!</h2>
            <p className="text-surface-200/60 mt-2">{result.message}</p>
          </div>
        )}

        {error && <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        {status === 'ready' && (
          <button onClick={handleScan} disabled={!faceDetected || !selectedSession}
            className="mt-4 w-full py-3 gradient-accent rounded-xl text-white font-semibold hover:opacity-90 transition-all disabled:opacity-30 shadow-lg">
            🤖 Scan Face & Mark Attendance
          </button>
        )}
        {status === 'detecting' && (
          <div className="mt-4 flex justify-center items-center gap-2 text-accent-400">
            <span className="w-5 h-5 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />Recognizing...
          </div>
        )}
      </div>
    </div>
  );
}
