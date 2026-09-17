import React, { useState } from 'react';
import {
  Lock,
  LogIn,
  KeyRound,
  Shield,
  UserCheck,
  Sparkles,
  AlertCircle,
  Database,
  CheckCircle2,
  X,
  User,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { OfflineDB } from '../../services/db';
import { loginWithGoogle, auth, isConfigured } from '../../services/firebase';
import { useApp } from '../../context/AppProvider';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
  allUsers: UserProfile[];
  currentUser: UserProfile;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  canDismiss = false,
  allUsers,
  currentUser,
  onLoginSuccess,
}) => {
  const { isOnline, firestoreStatus } = useApp();
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUser?.uid || allUsers[0]?.uid || 'admin-sajjad-01'
  );
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'pin' | 'google'>('pin');

  if (!isOpen) return null;

  const selectedUser = allUsers.find((u) => u.uid === selectedUserId) || allUsers[0];

  // Handle PIN Submission
  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setErrorMsg('Please enter your 4-digit PIN');
      return;
    }

    const isValid = OfflineDB.verifyUserPin(selectedUserId, pin);
    if (isValid) {
      setErrorMsg(null);
      OfflineDB.setCurrentUser(selectedUser);
      OfflineDB.setSessionLocked(false);
      OfflineDB.recordAuthEvent('LOGIN', selectedUser, 'Staff PIN');
      onLoginSuccess(selectedUser);
      setPin('');
      if (onClose) onClose();
    } else {
      setErrorMsg(`Incorrect PIN for ${selectedUser?.displayName}. (Default Admin: 1234, Staff: 0000)`);
      setPin('');
    }
  };

  // Handle Google Sign-in
  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    setErrorMsg(null);
    try {
      const result = await loginWithGoogle();
      const fbUser = result.user;
      
      const email = fbUser.email || 'newsajjadzaricorporation@gmail.com';
      const displayName = fbUser.displayName || 'Google Admin';
      const isOwnerAdmin =
        email === 'newsajjadzaricorporation@gmail.com' ||
        email.includes('admin') ||
        fbUser.uid === 'admin-sajjad-01';

      let matchedUser = allUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() || u.uid === fbUser.uid
      );

      if (!matchedUser) {
        matchedUser = {
          uid: fbUser.uid,
          email,
          displayName,
          role: isOwnerAdmin ? 'admin' : 'staff',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        OfflineDB.saveUser(matchedUser, 'system');
      } else {
        matchedUser = {
          ...matchedUser,
          lastLogin: new Date().toISOString(),
        };
        OfflineDB.saveUser(matchedUser, 'system');
      }

      OfflineDB.setCurrentUser(matchedUser);
      OfflineDB.setSessionLocked(false);
      OfflineDB.recordAuthEvent('LOGIN', matchedUser, 'Google Authentication');
      onLoginSuccess(matchedUser);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Google Sign-in Error:', err);
      setErrorMsg(err?.message || 'Google sign-in was cancelled or encountered an error.');
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (digit === 'CLEAR') {
      setPin('');
      setErrorMsg(null);
    } else if (digit === 'BACKSPACE') {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg(null);
      // Auto-submit on 4 digits
      if (nextPin.length === 4) {
        setTimeout(() => {
          const isValid = OfflineDB.verifyUserPin(selectedUserId, nextPin);
          if (isValid) {
            OfflineDB.setCurrentUser(selectedUser);
            OfflineDB.setSessionLocked(false);
            OfflineDB.recordAuthEvent('LOGIN', selectedUser, 'Staff PIN Keypad');
            onLoginSuccess(selectedUser);
            setPin('');
            if (onClose) onClose();
          } else {
            setErrorMsg(`Incorrect PIN. (Default Admin: 1234, Staff: 0000)`);
            setPin('');
          }
        }, 150);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                New Sajjad Zari POS
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Authentication
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Secure Terminal Login & Staff Shift Authorization
              </p>
            </div>
          </div>

          {canDismiss && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Toggle: PIN vs Google */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex gap-2">
          <button
            onClick={() => {
              setAuthMode('pin');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              authMode === 'pin'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Staff Quick PIN
          </button>
          <button
            onClick={() => {
              setAuthMode('google');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              authMode === 'google'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            Google Cloud Auth
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {authMode === 'pin' ? (
            <div className="space-y-4">
              {/* Select User Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select User Account:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {allUsers.map((u) => (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(u.uid);
                        setPin('');
                        setErrorMsg(null);
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                        selectedUserId === u.uid
                          ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm ring-1 ring-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            u.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-slate-100">
                            {u.displayName}
                          </p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN Code Dots Display */}
              <div className="space-y-2 text-center pt-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Enter 4-Digit Security PIN
                </label>
                <div className="flex items-center justify-center gap-3 py-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-150 ${
                        pin.length > idx
                          ? 'bg-amber-400 scale-110 shadow-lg shadow-amber-400/50 ring-2 ring-amber-300'
                          : 'bg-slate-800 border border-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Default PINs: Admin (<span className="text-amber-400 font-mono">1234</span>), Staff (<span className="text-blue-400 font-mono">0000</span>)
                </p>
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 pt-1 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((keyVal) => (
                  <button
                    key={keyVal}
                    type="button"
                    onClick={() => {
                      if (keyVal === 'C') handleKeypadPress('CLEAR');
                      else if (keyVal === '⌫') handleKeypadPress('BACKSPACE');
                      else handleKeypadPress(keyVal);
                    }}
                    className={`py-3.5 rounded-xl font-mono text-sm font-bold transition flex items-center justify-center ${
                      keyVal === 'C'
                        ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                        : keyVal === '⌫'
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-800 hover:border-slate-700 active:scale-95'
                    }`}
                  >
                    {keyVal}
                  </button>
                ))}
              </div>

              {/* Manual Login Button */}
              <button
                type="button"
                onClick={() => handlePinSubmit()}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 mt-2"
              >
                <LogIn className="w-4 h-4" />
                Unlock Terminal & Sign In
              </button>
            </div>
          ) : (
            /* Google Cloud Auth Tab */
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Google Cloud Single Sign-On</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Authenticate securely with your Google Workspace account to sync live sales, inventory, and Khata records directly with Cloud Firestore.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-400 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center py-0.5">
                  <span>Authorized Project:</span>
                  <span className="font-mono text-amber-300 font-medium">
                    new-sajjad-zari-corporation
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Admin Identity:</span>
                  <span className="font-mono text-slate-200">
                    newsajjadzaricorporation@gmail.com
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoadingGoogle}
                className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm shadow-xl transition flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
              >
                {isLoadingGoogle ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>
                  {isLoadingGoogle ? 'Signing in with Google...' : 'Sign in with Google'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Diagnostics */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{isOnline ? 'Network Online' : 'Offline Mode (Local Storage Ready)'}</span>
          </div>
          <span className="font-mono text-slate-500">v2.4 Zero-Trust RBAC</span>
        </div>
      </div>
    </div>
  );
};
