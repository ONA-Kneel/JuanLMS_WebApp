//PROFILE MODAL

// ===================== Imports =====================
import React, { useState, useCallback, useEffect } from 'react';
import ReactDom from 'react-dom';
import Modal from 'react-modal';
import Cropper from 'react-easy-crop';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import SupportModal from './Support/SupportModal';
import profileicon from "../assets/profileicon (1).svg";
import ValidationModal from './ValidationModal';
import { getProfileImageUrl } from "../utils/imageUtils";

Modal.setAppElement('#root');

const API_BASE = import.meta.env.VITE_API_URL || "https://juanlms-webapp-server.onrender.com";

// ===================== ChangePasswordModal =====================
function ChangePasswordModal({ userId, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: request OTP, 2: enter OTP, 3: enter passwords
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpLockout, setOtpLockout] = useState(false);
  const [otpLockoutTime, setOtpLockoutTime] = useState(0);

  // Add useEffect for cooldown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  // Lockout timer effect
  useEffect(() => {
    let timer;
    if (otpLockout && otpLockoutTime > 0) {
      timer = setInterval(() => {
        setOtpLockoutTime(prev => {
          if (prev <= 1) {
            setOtpLockout(false);
            setOtpAttempts(0);
            localStorage.removeItem('otpLockoutUntilChangePw');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpLockout, otpLockoutTime]);

  // On mount, check lockout
  useEffect(() => {
    const lockoutUntil = localStorage.getItem('otpLockoutUntilChangePw');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
      setOtpLockout(true);
      setOtpLockoutTime(Math.ceil((parseInt(lockoutUntil) - Date.now()) / 1000));
    }
  }, []);

  // --- Request OTP Handler ---
  const handleRequestOTP = async (e) => {
    e.preventDefault && e.preventDefault();
    if (otpLockout) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/users/${userId}/request-password-change-otp`);
      setSuccess("OTP sent to your personal email.");
      setStep(2);
      setCooldown(20); // 20s cooldown
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP.");
    }
    setLoading(false);
  };

  // --- Validate OTP Handler ---
  const handleValidateOTP = async (e) => {
    e.preventDefault();
    if (otpLockout) return;
    setError("");
    setSuccess("");
    if (!otp) {
      setError("Please enter the OTP sent to your email.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/users/${userId}/validate-otp`, { otp });
      setStep(3);
      setOtpAttempts(0); // reset attempts on success
    } catch (err) {
      setOtpAttempts(prev => {
        const newAttempts = prev + 1;
        if (newAttempts >= 5) {
          const lockoutUntil = Date.now() + 5 * 60 * 1000;
          localStorage.setItem('otpLockoutUntilChangePw', lockoutUntil);
          setOtpLockout(true);
          setOtpLockoutTime(5 * 60);
        }
        return newAttempts;
      });
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    }
    setLoading(false);
  };

  // --- Password Change Handler ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await axios.patch(`${API_BASE}/users/${userId}/change-password`, {
        currentPassword,
        newPassword
      });
      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <form className="bg-white p-6 rounded shadow w-96">
        <h2 className="text-xl font-bold mb-4">Change Password</h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}
        {/* Step 1: Request OTP */}
        {step === 1 && (
          <>
            <p className="mb-4">To change your password, request an OTP to your registered personal email.</p>
            <button
              type="button"
              className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition mb-2"
              onClick={handleRequestOTP}
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
            </div>
          </>
        )}
        {/* Step 2: Enter OTP */}
        {step === 2 && (
          <>
            <label className="block mb-2">Enter the OTP sent to your email</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 mb-4"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
              disabled={otpLockout}
            />
            <button
              type="button"
              className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition mb-2"
              onClick={handleValidateOTP}
              disabled={otpLockout || loading}
            >
              Next
            </button>
            <button
              type="button"
              className={`w-full p-3 rounded-lg transition mb-2 ${
                cooldown > 0 || loading || otpLockout
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              onClick={handleRequestOTP}
              disabled={cooldown > 0 || loading || otpLockout}
            >
              {otpLockout
                ? `Locked (${otpLockoutTime}s)`
                : cooldown > 0
                ? `Resend OTP in ${cooldown}s` 
                : loading 
                  ? 'Sending OTP...' 
                  : 'Resend OTP'}
            </button>
            {otpLockout && (
              <div className="text-red-600 text-sm mt-2">Too many failed attempts. Try again in {otpLockoutTime}s.</div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
            </div>
          </>
        )}
        {/* Step 3: Enter passwords */}
        {step === 3 && (
          <>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Current Password"
                className="w-full border rounded px-3 py-2 mb-2"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password"
                className="w-full border rounded px-3 py-2 mb-2"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                className="w-full border rounded px-3 py-2 mb-4"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-300">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white" disabled={loading} onClick={handleChangePassword}>Change</button>
            </div>
          </>
        )}
        {/* Step 4: Success */}
        {step === 4 && (
          <div>
            <div className="text-green-600 mb-2">Password changed successfully!</div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-blue-600 text-white">Close</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

// ===================== Main ProfileModal =====================
export default function ProfileModal({
  open,
  onClose,
  openCropModal,
  cropModalOpen,
  onCrop,
  closeCropModal,
  userType,
}) {
  // --- State ---
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [activeTab, setActiveTab] = useState("settings");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: ''
  });

  // --- Role Descriptions ---
  const roleDescriptions = {
    // Handle both singular and plural forms
    student: "Student | (To implement soon)",
    students: "Student | (To implement soon)",
    faculty: "Faculty | (To implement soon)",
    principal: "Dean | (To implement soon)",
    admin: "Administrator | (To implement soon)",
    "vice president of education": "Vice President of Education | (To implement soon)",
    parent: "Parent | Guardian",
  };

  // Helper function to get role description with fallbacks
  const getRoleDescription = (role) => {
    console.log('ProfileModal: getRoleDescription called with role:', role);
    
    if (!role) {
      console.log('ProfileModal: No role provided, returning default');
      return "User | (To implement soon)";
    }
    
    // Try exact match first
    if (roleDescriptions[role]) {
      console.log('ProfileModal: Exact match found:', roleDescriptions[role]);
      return roleDescriptions[role];
    }
    
    // Try case-insensitive match
    const lowerRole = role.toLowerCase();
    for (const [key, value] of Object.entries(roleDescriptions)) {
      if (key.toLowerCase() === lowerRole) {
        console.log('ProfileModal: Case-insensitive match found:', value);
        return value;
      }
    }
    
    // Fallback: capitalize the role and add default text
    const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    const fallbackDescription = `${capitalizedRole} | (To implement soon)`;
    console.log('ProfileModal: Using fallback description:', fallbackDescription);
    return fallbackDescription;
  };

  // Fetch user info from backend
  const fetchUserInfo = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user._id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Only update localStorage if the response has valid fields
      if (res.data && res.data.firstname && res.data.lastname) {
        setUserInfo(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } else {
        setUserInfo({});
      }
    } catch {
      setUserInfo({});
    }
  };

  // Handle logout
  const handleLogout = async () => {
    console.log('Logout button clicked');
    try {
      // Call logout endpoint to create audit log
      const token = localStorage.getItem('token');
      console.log('Token found:', !!token);
      if (token) {
        console.log('Making logout API call to:', `${API_BASE}/logout`);
        const response = await axios.post(`${API_BASE}/logout`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Logout API response:', response.data);
      }
    } catch (error) {
      console.error('Error during logout:', error);
      console.error('Error details:', error.response?.data);
      // Continue with logout even if audit log fails
    }

    console.log('Clearing local storage...');
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userID');
    localStorage.removeItem('role');
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberedPassword');

    console.log('Closing modal and redirecting...');
    // Close modal and redirect to login
    onClose();
    window.location.href = '/';
  };

  useEffect(() => {
    fetchUserInfo();
    // eslint-disable-next-line
  }, [open]);

  // ===================== Cropper Logic =====================
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result);
    });
    reader.readAsDataURL(file);
  };

  const getCroppedImg = (imageSrc, crop) => {
    const createImage = (url) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
      });

    return createImage(imageSrc).then(image => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const { width, height } = crop;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(
        image,
        crop.x,
        crop.y,
        width,
        height,
        0,
        0,
        width,
        height
      );
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          const croppedImageUrl = URL.createObjectURL(blob);
          resolve(croppedImageUrl);
        }, 'image/jpeg');
      });
    });
  };

  const resetCropState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setImageSrc(null);
  };

  const showCroppedImage = useCallback(async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      const blob = await fetch(croppedImage).then(res => res.blob());
      const formData = new FormData();
      formData.append('image', blob, 'profile.jpg');
      const uploadResponse = await fetch(`${API_BASE}/users/${user._id}/upload-profile`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        setValidationModal({
          isOpen: true,
          type: 'error',
          title: 'Upload Failed',
          message: uploadData.error || "Image upload failed"
        });
        return;
      }
      // Fetch updated user info from backend
      await fetchUserInfo();
      onCrop();
      closeCropModal();
      resetCropState();
    } catch (e) {
      console.error(e);
      setValidationModal({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: "An error occurred while uploading the image."
      });
    }
  }, [croppedAreaPixels, imageSrc, onCrop, closeCropModal]);

  // ===================== Render =====================
  if (!open) return null;

    return ReactDom.createPortal(
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30 p-4"
        onClick={onClose} // 🔹 click outside closes modal
      >
        <div
          className="z-40 bg-gray-50/95 p-6 md:p-12 rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] overflow-y-auto font-poppinsr relative"
          onClick={(e) => e.stopPropagation()} // 🔹 click inside does nothing
        >
          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="absolute right-10 top-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-poppinsb transition-colors"
          >
            Logout
          </button>

        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-6">
          <div className="justify-center items-center text-center">
            <img
              className="w-28 h-28 rounded-full bg-gray-600 object-cover"
              src={getProfileImageUrl(userInfo.profilePic, API_BASE, profileicon)}
              alt="Avatar"
              onError={e => { e.target.onerror = null; e.target.src = profileicon; }}
            />
            <button
              className="font-poppinsr hover:underline hover:text-blue-800 mt-2.5 ml-1.5 text-sm cursor-pointer"
              onClick={openCropModal}
            >
              Change Profile
            </button>
          </div>

          {/* Crop Modal */}
          <Modal
            isOpen={cropModalOpen}
            onRequestClose={() => {
              closeCropModal();
              resetCropState();
            }}
            style={{
              content: {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 60,
              },
            }}
            contentLabel="Crop Modal"
            overlayClassName="fixed inset-0 bg-gray-50/75 z-[100] font-poppinsb"
          >
            <h2 className="text-center">Please upload a Picture.</h2>
            {/* Cropper Content */}
            {!imageSrc ? (
              <div className="flex justify-center mt-4">
                <label className="inline-flex my-4 items-center px-4 py-2 bg-blue-900 text-white rounded cursor-pointer hover:bg-blue-950">
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <>
                <div className="relative w-full h-64 bg-gray-200 mt-4">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <div className="mt-4 flex justify-center space-x-4">
                  <button className="px-4 py-1 text-white bg-blue-900 rounded hover:bg-blue-950" onClick={showCroppedImage}>
                    Save
                  </button>
                  <button className="px-4 py-1 text-gray-800 bg-gray-200 rounded hover:bg-gray-300" onClick={() => { closeCropModal(); resetCropState(); }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </Modal>

          {/* Dynamic Info */}
          <div className="mb-5 text-center lg:text-left">
            <h2 className="text-3xl font-bold">{userInfo.firstname || 'First'} {userInfo.lastname || 'Last'}</h2>
            <p className="text-sm text-gray-600">{getRoleDescription(userType)}</p>
            <div className="flex items-center gap-2 text-green-600 text-sm mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Available
            </div>
          </div>

          <div className="space-y-1 text-sm text-center lg:text-left ml-20">
            <div className="flex items-center gap-2 text-sm">
              <span className="material-icons text-black">email</span>
              <a href={`mailto:${userInfo.email || ''}`} className="text-blue-600 hover:underline">
                {userInfo.email || 'No email'}
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {/* <span className="material-icons text-black">phone</span>
              <a href={`tel:${userInfo.contactno || ''}`} className="text-blue-600 hover:underline">
                {userInfo.contactno || 'No phone'}
              </a> */}
            </div>
          </div>
        </div>

        {/* ===================== Settings Content ===================== */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          <div>
            {/* Other settings here */}
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setShowChangePassword(true)}
            >
              Change Password
            </button>
            {/* Remove Support Center button for admin users */}
            {!(userType && userType.trim().toLowerCase() === 'admin') && (
              <>
                <button
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  onClick={() => setShowHelp(true)}
                >
                  Support Center
                </button>
                {showHelp && <SupportModal onClose={() => setShowHelp(false)} />}
              </>
            )}
          </div>
        </div>

        {/* ===================== Change Password Modal ===================== */}
        {showChangePassword && (
          <ChangePasswordModal userId={userInfo._id} onClose={() => setShowChangePassword(false)} />
        )}

        <ValidationModal
          isOpen={validationModal.isOpen}
          onClose={() => setValidationModal({ ...validationModal, isOpen: false })}
          type={validationModal.type}
          title={validationModal.title}
          message={validationModal.message}
        />
      </div>
    </div>,
    document.getElementById('portal')
  );
}
