import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { attendanceService } from '../../services/services';

export default function QRScan() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const scannerRef = useRef(null);

  const startScanner = async () => {
    setError('');
    setResult(null);
    setPermissionDenied(false);

    try {
      // Check camera permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the test stream immediately
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      setPermissionDenied(true);
      setError('Camera access denied. Please allow camera access in your browser settings and reload the page.');
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-box');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          try { await html5QrCode.stop(); } catch {}
          scannerRef.current = null;
          setScanning(false);

          try {
            const res = await attendanceService.markQR({ qrToken: decodedText });
            setResult(res.data);
            setError('');
          } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark attendance');
          }
        },
        () => {}
      );

      setScanning(true);
    } catch (err) {
      // Fallback: try user-facing camera (laptops)
      try {
        const html5QrCode = new Html5Qrcode('qr-reader-box');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'user' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            try { await html5QrCode.stop(); } catch {}
            scannerRef.current = null;
            setScanning(false);

            try {
              const res = await attendanceService.markQR({ qrToken: decodedText });
              setResult(res.data);
              setError('');
            } catch (err) {
              setError(err.response?.data?.message || 'Failed to mark attendance');
            }
          },
          () => {}
        );
        setScanning(true);
      } catch (err2) {
        setError('Could not start camera. Please ensure camera permissions are allowed.');
      }
    }
  };

  // Auto-start scanner on mount
  useEffect(() => {
    const timer = setTimeout(() => startScanner(), 300);
    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text mb-2">QR Scanner</h1>
      <p className="text-surface-200/60 mb-6">Point your camera at the QR code</p>

      <div className="glass rounded-2xl p-6 shadow-2xl">
        {/* Camera video — always in DOM so html5-qrcode can find it */}
        <div
          id="qr-reader-box"
          style={{
            display: scanning ? 'block' : 'none',
            width: '100%',
            minHeight: '320px',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        />

        {/* Not scanning yet and no result */}
        {!scanning && !result && !error && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/10 flex items-center justify-center text-3xl">📷</div>
            <p className="text-surface-200/60 mb-4">Starting camera...</p>
            <button onClick={startScanner} className="px-6 py-2.5 gradient-primary rounded-xl text-white text-sm font-medium">
              Open Camera
            </button>
          </div>
        )}

        {/* Permission denied */}
        {permissionDenied && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center text-4xl">🔒</div>
            <h2 className="text-xl font-bold text-amber-600">Camera Access Needed</h2>
            <p className="text-surface-200/60 mt-2 max-w-sm mx-auto">
              Please allow camera access in your browser. Click the camera icon in your browser's address bar, then reload.
            </p>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center text-4xl animate-float">✅</div>
            <h2 className="text-xl font-bold text-green-600">Attendance Marked!</h2>
            <p className="text-surface-200/60 mt-2">{result.message}</p>
            <button onClick={() => { setResult(null); startScanner(); }}
              className="mt-6 px-6 py-2.5 gradient-primary rounded-xl text-white text-sm font-medium">
              Scan Again
            </button>
          </div>
        )}

        {/* Error (non-permission) */}
        {error && !result && !permissionDenied && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center text-4xl">❌</div>
            <h2 className="text-xl font-bold text-red-500">Error</h2>
            <p className="text-surface-200/60 mt-2">{error}</p>
            <button onClick={() => { setError(''); startScanner(); }}
              className="mt-6 px-6 py-2.5 gradient-primary rounded-xl text-white text-sm font-medium">
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Force camera video to be visible inside html5-qrcode container */}
      <style>{`
        #qr-reader-box video {
          width: 100% !important;
          height: auto !important;
          display: block !important;
          border-radius: 12px;
          object-fit: cover;
        }
        #qr-reader-box img[alt="Info icon"],
        #qr-reader-box > div:last-child {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
