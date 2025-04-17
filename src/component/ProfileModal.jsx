import React from 'react';
import ReactDom from 'react-dom';
import Modal from 'react-modal';
import Avatar from 'react-avatar-edit';

Modal.setAppElement('#root');

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
}) {
  if (!open) return null;

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 60,
    },
  };

  return ReactDom.createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-30 p-4">
      <div className="z-40 bg-gray-50/95 p-6 md:p-12 rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] overflow-y-auto font-poppinsr relative">
        {/* Sign-out */}
        <button onClick={onClose} className="absolute right-10 top-6 text-black font-poppinsb hover:underline">
          Sign-out
        </button>

        {/* Avatar + Change button */}
        <div className="flex items-center gap-6 mb-6">
          <div className="justify-center items-center text-center">
            <img className="w-28 h-28 rounded-full bg-gray-600" src={avatarImg} />
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
            onRequestClose={closeCropModal}
            style={customStyles}
            contentLabel="Crop Modal"
            overlayClassName="fixed inset-0 bg-gray-50/75 z-[100] font-poppinsb"
          >
            <h2 className="text-center">Please upload a Picture.</h2>
            <div className="w-full flex justify-center">
              <Avatar
                width={window.innerWidth < 450 ? 280 : 390}
                height={295}
                onCrop={onCrop}
                onClose={closeCropModal}
              />
            </div>
            <div className="mt-3 flex justify-center">
              <button className="px-4 py-1 text-white bg-blue-900 rounded hover:bg-blue-950" onClick={closeCropModal}>
                Save
              </button>
            </div>
          </Modal>

          {/* Name and Info */}
          <div className="mb-5 text-center lg:text-left">
            <h2 className="text-3xl font-bold">{name}</h2>
            <p className="text-sm text-gray-600">Student | College of Allied Health</p>
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

        {/* Tabs */}
        <div className="flex gap-6 text-lg font-semibold border-b border-gray-300 pb-2 mb-4">
          <button className="hover:text-blue-800">My Badges</button>
          <button className="hover:text-blue-800">Settings</button>
        </div>

        <div className="bg-gray-200 rounded-2xl h-40 w-60" />
      </div>
    </div>,
    document.getElementById('portal')
  );
}
