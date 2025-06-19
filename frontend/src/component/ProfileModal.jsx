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

Modal.setAppElement('#root');

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  // --- Request OTP Handler ---
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/users/${userId}/request-password-change-otp`);
      setSuccess("OTP sent to your personal email.");
      setStep(2);
      setCooldown(20); // Start 20 second cooldown
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP.");
    }
    setLoading(false);
  };

  // --- Validate OTP Handler ---
  const handleValidateOTP = async (e) => {
    e.preventDefault();
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
    } catch (err) {
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
            />
            <button
              type="button"
              className="w-full bg-blue-900 text-white p-3 rounded-lg hover:bg-blue-950 transition mb-2"
              onClick={handleValidateOTP}
            >
              Next
            </button>
            <button
              type="button"
              className={`w-full p-3 rounded-lg transition mb-2 ${
                cooldown > 0 || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              onClick={handleRequestOTP}
              disabled={cooldown > 0 || loading}
            >
              {cooldown > 0 
                ? `Resend OTP in ${cooldown}s` 
                : loading 
                  ? 'Sending OTP...' 
                  : 'Resend OTP'}
            </button>
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
  const [activeTab, setActiveTab] = useState("badges");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [userInfo, setUserInfo] = useState({});

  // --- Role Descriptions ---
  const roleDescriptions = {
    student: "Student | (To implement soon)",
    faculty: "Faculty | (To implement soon)",
    director: "Dean | (To implement soon)",
    admin: "Administrator | (To implement soon)",
    parent: "Parent | Guardian",
  };

  // Fetch user info from backend
  const fetchUserInfo = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user._id) return;
    try {
      const res = await axios.get(`${API_BASE}/users/${user._id}`);
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
        alert(uploadData.error || "Image upload failed");
        return;
      }
      // Fetch updated user info from backend
      await fetchUserInfo();
      onCrop();
      closeCropModal();
      resetCropState();
    } catch (e) {
      console.error(e);
      alert("An error occurred while uploading the image.");
    }
  }, [croppedAreaPixels, imageSrc, onCrop, closeCropModal]);

  // ===================== Render =====================
  if (!open) return null;

  return ReactDom.createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-30 p-4">
      <div className="z-40 bg-gray-50/95 p-6 md:p-12 rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] overflow-y-auto font-poppinsr relative">
        {/* Sign-out Button */}
        <button 
          onClick={() => {
            // Clear all user data from localStorage
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('userID');
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedPassword');
            // Close modal and redirect to login
            onClose();
            window.location.href = '/';
          }} 
          className="absolute right-10 top-6 text-black font-poppinsb hover:underline"
        >
          Sign-out
        </button>

        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-6">
          <div className="justify-center items-center text-center">
            <img
              className="w-28 h-28 rounded-full bg-gray-600 object-cover"
              src={
                userInfo.profilePic
                  ? `${API_BASE}/uploads/${userInfo.profilePic}`
                  : profileicon
              }
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
            <p className="text-sm text-gray-600">{roleDescriptions[userType] || "User"}</p>
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

        {/* ===================== Tab Navigation ===================== */}
        <div className="flex gap-6 text-lg font-semibold border-b border-gray-300 pb-2 mb-4">
          <button
            className={`hover:text-blue-800 ${activeTab === "badges" ? "text-blue-800 underline" : ""}`}
            onClick={() => setActiveTab("badges")}
          >
            My Badges
          </button>
          <button
            className={`hover:text-blue-800 ${activeTab === "settings" ? "text-blue-800 underline" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </div>

        {/* ===================== Tab Content ===================== */}
        {activeTab === "badges" && (
          <div className="bg-gray-200 rounded-2xl h-40 w-60">
            {/* Badges content here */}
          </div>
        )}
        {activeTab === "settings" && (
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
        )}

        {/* ===================== Change Password Modal ===================== */}
        {showChangePassword && (
          <ChangePasswordModal userId={userInfo._id} onClose={() => setShowChangePassword(false)} />
        )}
      </div>
    </div>,
    document.getElementById('portal')
  );
}
