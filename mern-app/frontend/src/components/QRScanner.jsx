import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

/**
 * QR Code Scanner Component (Tier A Feature)
 * Uses html5-qrcode for camera-based QR scanning
 */
const QRScanner = ({ onScan, onError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  const startScanner = () => {
    if (scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        // Don't stop scanner — allow continuous scanning
      },
      (errorMessage) => {
        // Ignore scan errors (happens continuously while searching)
      }
    );

    scannerRef.current = scanner;
    setIsScanning(true);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="qr-scanner-wrapper">
      {!isScanning ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <button 
            onClick={startScanner}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto',
            }}
          >
            📷 Start QR Scanner
          </button>
          <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Allow camera access to scan participant QR codes
          </p>
        </div>
      ) : (
        <div>
          <button 
            onClick={stopScanner}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}
          >
            ⬜ Stop Scanner
          </button>
        </div>
      )}
      <div id="qr-reader" ref={containerRef} style={{ maxWidth: '500px', margin: '0 auto' }} />
    </div>
  );
};

export default QRScanner;
