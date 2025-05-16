// ===================== Imports =====================
import React, { useState, useCallback } from 'react';
import ReactDom from 'react-dom';
import Modal from 'react-modal';
import Cropper from 'react-easy-crop';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

Modal.setAppElement('#root');

// ===================== ChangePasswordModal =====================
function ChangePasswordModal({ userId, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      await axios.patch(`http://localhost:5000/users/${userId}/change-password`, {
        currentPassword,
        newPassword,
      });
      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <form onSubmit={handleChangePassword} className="bg-white p-6 rounded shadow w-96">
        <h2 className="text-xl font-bold mb-4">Change Password</h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}
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
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white" disabled={loading}>Change</button>
        </div>
      </form>
    </div>
  );
}

// ===================== Main ProfileModal =====================
export default function ProfileModal({
  open,
  onClose,
  avatarImg,
  name,
  email,
  phone,
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

  const user = JSON.parse(localStorage.getItem('user'));

  // --- Role Descriptions ---
  const roleDescriptions = {
    student: "Student | (To implement soon)",
    faculty: "Faculty | (To implement soon)",
    director: "Dean | (To implement soon)",
    admin: "Administrator | (To implement soon)",
    parent: "Parent | Guardian",
  };

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

    return new Promise(async (resolve, reject) => {
      const image = await createImage(imageSrc);
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
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const croppedImageUrl = URL.createObjectURL(blob);
        resolve(croppedImageUrl);
      }, 'image/jpeg');
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
      const uploadResponse = await fetch(`http://localhost:5000/users/${user._id}/upload-profile`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        alert(uploadData.error || "Image upload failed");
        return;
      }
      const userResponse = await fetch(`http://localhost:5000/users/${user._id}`);
      const updatedUser = await userResponse.json();
      if (!userResponse.ok) {
        alert("Failed to fetch updated user data.");
        return;
      }
      localStorage.setItem('user', JSON.stringify(updatedUser));
      const uploadedImageUrl = updatedUser.profilePic;
      onCrop(uploadedImageUrl);
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
              src={avatarImg || '../assets/profileicon (1).svg'}
              alt="Avatar"
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
            <h2 className="text-3xl font-bold">{name}</h2>
            <p className="text-sm text-gray-600">{roleDescriptions[userType] || "User"}</p>
            <div className="flex items-center gap-2 text-green-600 text-sm mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Available
            </div>
          </div>

          <div className="space-y-1 text-sm text-center lg:text-left ml-20">
            <div className="flex items-center gap-2 text-sm">
              <span className="material-icons text-black">email</span>
              <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
                {email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="material-icons text-black">phone</span>
              <a href={`tel:${phone}`} className="text-blue-600 hover:underline">
                {phone}
              </a>
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
          </div>
        )}

        {/* ===================== Change Password Modal ===================== */}
        {showChangePassword && (
          <ChangePasswordModal userId={user?._id} onClose={() => setShowChangePassword(false)} />
        )}
      </div>
    </div>,
    document.getElementById('portal')
  );
}
