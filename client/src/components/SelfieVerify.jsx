import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { CameraIcon, CheckIcon, Modal, Notice } from './ui.jsx';

const CAPTURE_SIZE = 480;

/* Reads any picked image file, center-crops it to a square and re-encodes it
 * as a modestly sized JPEG so even phone photos stay small. */
function fileToSelfie(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = CAPTURE_SIZE;
        canvas.height = CAPTURE_SIZE;
        canvas
          .getContext('2d')
          .drawImage(
            img,
            (img.naturalWidth - side) / 2,
            (img.naturalHeight - side) / 2,
            side,
            side,
            0,
            0,
            CAPTURE_SIZE,
            CAPTURE_SIZE
          );
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

/*
 * Selfie verification flow: live camera -> capture -> confirm -> verified.
 * Falls back to a file/upload picker when a camera isn't available or the
 * permission is denied (e.g. insecure contexts, desktops without webcams).
 */
export default function SelfieVerify({ onClose, onVerified }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState('camera'); // camera | preview | done
  const [shot, setShot] = useState(null);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (phase !== 'camera') return undefined;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera API');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setCameraBlocked(true);
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [phase, stopCamera]);

  // Leave the success screen automatically — the tick is the payoff.
  useEffect(() => {
    if (phase !== 'done') return undefined;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = CAPTURE_SIZE;
    canvas.height = CAPTURE_SIZE;
    const ctx = canvas.getContext('2d');
    const side = Math.min(video.videoWidth, video.videoHeight);
    ctx.translate(CAPTURE_SIZE, 0);
    ctx.scale(-1, 1); // keep the same mirroring the preview shows
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      CAPTURE_SIZE,
      CAPTURE_SIZE
    );
    setShot(canvas.toDataURL('image/jpeg', 0.85));
    setPhase('preview');
  }

  async function pickFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      setShot(await fileToSelfie(file));
      setPhase('preview');
    } catch {
      setError('Could not read that image — try another one.');
    }
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const data = await api('/users/me/verify-selfie', { method: 'POST', body: { selfie: shot } });
      stopCamera();
      setPhase('done');
      onVerified?.(data.user);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Verify with a selfie"
      subtitle="One quick live photo confirms you're a real student. The photo stays private — other students only see the verified tick."
      onClose={onClose}
    >
      {phase === 'camera' ? (
        <div className="stack" style={{ gap: 14 }}>
          {error ? (
            <Notice kind="error" onClose={() => setError('')}>
              {error}
            </Notice>
          ) : null}

          {cameraBlocked ? (
            <div className="stack" style={{ gap: 10, alignItems: 'center', textAlign: 'center', padding: '18px 0' }}>
              <span className="verify-ico" style={{ width: 56, height: 56, borderRadius: 16 }}>
                <CameraIcon size={26} />
              </span>
              <p className="muted" style={{ margin: 0, maxWidth: '40ch' }}>
                We couldn't access your camera. You can allow camera access in your browser, or
                upload a recent photo of yourself instead.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => document.getElementById('selfie-file').click()}>
                Upload a photo
              </button>
              <input
                id="selfie-file"
                type="file"
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
                onChange={pickFile}
              />
            </div>
          ) : (
            <>
              <div className="selfie-frame">
                <video ref={videoRef} playsInline muted />
                <div className="selfie-hint">Center your face, then capture</div>
              </div>
              <div className="selfie-actions">
                <button type="button" className="btn btn-primary" onClick={capture}>
                  <span className="row" style={{ gap: 8 }}>
                    <CameraIcon size={17} />
                    Capture selfie
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => document.getElementById('selfie-file').click()}
                >
                  Upload instead
                </button>
                <input
                  id="selfie-file"
                  type="file"
                  accept="image/*"
                  capture="user"
                  style={{ display: 'none' }}
                  onChange={pickFile}
                />
              </div>
            </>
          )}
        </div>
      ) : null}

      {phase === 'preview' ? (
        <div className="stack" style={{ gap: 14 }}>
          {error ? (
            <Notice kind="error" onClose={() => setError('')}>
              {error}
            </Notice>
          ) : null}
          <div className="selfie-frame">
            <img src={shot} alt="Your selfie preview" />
          </div>
          <p className="muted small" style={{ margin: 0, textAlign: 'center' }}>
            Look good? Submit it to get the verified tick on your profile.
          </p>
          <div className="selfie-actions">
            <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
              {busy ? 'Verifying…' : 'Submit & get verified'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setShot(null);
                setPhase('camera');
              }}
              disabled={busy}
            >
              Retake
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'done' ? (
        <div className="selfie-done">
          <span className="big-tick">
            <CheckIcon size={36} />
          </span>
          <div>
            <h3 style={{ margin: 0 }}>You're verified!</h3>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              Other students now see a verified tick next to your name.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
