import { useRef } from "react";
import defaultAvatar from "../../assets/profileicon (1).svg";
import { getProfileImageUrl } from "../../utils/imageUtils";

export default function ForumModal({
  isOpen,
  onClose,
  selectedChat,
  apiBase,
  forumThreads,
  activeForumThreadId,
  setActiveForumThreadId,
  forumPostTitle,
  setForumPostTitle,
  forumPostBody,
  setForumPostBody,
  forumReplyBody,
  setForumReplyBody,
  forumPostFiles,
  forumReplyFiles,
  removeForumFile,
  handleForumFileSelect,
  handleCreateForumPost,
  handleReplyToThread,
  isPostingThread,
  isPostingReply,
  currentUserId,
  getSenderDisplayName,
  getSenderAvatar,
  renderAttachmentPreview,
  formatForumTimestamp
}) {
  const forumPostFileInputRef = useRef(null);
  const forumReplyFileInputRef = useRef(null);

  if (!isOpen || !selectedChat) return null;

  const resolveTopicTitle = (root) => {
    if (!root) return "Untitled Topic";
    if (root.title && root.title.trim()) return root.title.trim();
    if (root.message && root.message.trim()) return root.message.trim();
    return "Untitled Topic";
  };

  const currentThread = forumThreads.find((thread) => thread.threadId === activeForumThreadId) || null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <p className="text-sm text-gray-500">SJDEF Forum</p>
            <h3 className="text-2xl font-semibold text-gray-900">{selectedChat?.name || "Forum"}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Create topics and respond with threaded replies for clearer conversations.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
            aria-label="Close forum modal"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden px-4 py-4">
          <div className="lg:w-1/2 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 p-4 space-y-3">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Create New Topic</h4>
                <p className="text-sm text-gray-500">Share updates, files, or questions with the entire forum.</p>
              </div>
              <input
                type="text"
                value={forumPostTitle}
                onChange={(e) => setForumPostTitle(e.target.value)}
                placeholder="Topic title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={forumPostBody}
                onChange={(e) => setForumPostBody(e.target.value)}
                rows={4}
                placeholder="Add context or details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {forumPostFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {forumPostFiles.map((file, idx) => (
                    <span
                      key={`${file.name}-${idx}`}
                      className="bg-blue-50 text-blue-900 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                    >
                      {file.name}
                      <button onClick={() => removeForumFile("post", idx)} className="text-red-500 hover:text-red-700">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => forumPostFileInputRef.current?.click()}
                  >
                    Attach files
                  </button>
                  <input
                    type="file"
                    multiple
                    ref={forumPostFileInputRef}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.ppt,.pptx"
                    onChange={(e) => handleForumFileSelect(e, "post")}
                  />
                </div>
                <button
                  onClick={handleCreateForumPost}
                  disabled={isPostingThread}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPostingThread ? "Posting..." : "Post Topic"}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {forumThreads.length > 0 ? (
                forumThreads.map((thread) => {
                  const replyCount = thread.replies.length;
                  const snippet = thread.root.message
                    ? thread.root.message.length > 140
                      ? `${thread.root.message.slice(0, 140)}…`
                      : thread.root.message
                    : "No description yet.";
                  const lastActivity =
                    replyCount > 0 ? thread.replies[thread.replies.length - 1] : thread.root;
                  return (
                    <button
                      type="button"
                      key={thread.threadId}
                      onClick={() => setActiveForumThreadId(thread.threadId)}
                      className={`w-full text-left border rounded-lg p-3 transition ${
                        activeForumThreadId === thread.threadId
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-200"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {resolveTopicTitle(thread.root)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Started by {getSenderDisplayName(thread.root)} ·{" "}
                            {formatForumTimestamp(thread.root.createdAt)}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full">
                          {replyCount} replies
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{snippet}</p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Last activity {formatForumTimestamp(lastActivity.createdAt || lastActivity.updatedAt)}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500 text-center py-6">No topics yet. Be the first to post!</div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {activeForumThreadId ? (
              <>
                <div className="border-b border-gray-200 p-4">
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div>
                      <p className="text-sm text-gray-500">Currently viewing</p>
                      <h4 className="text-xl font-semibold text-gray-900">
                        {resolveTopicTitle(currentThread?.root)}
                      </h4>
                    </div>
                    <span className="text-xs text-gray-500">
                      Thread ID: <span className="font-mono">{activeForumThreadId}</span>
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {(() => {
                    const activeThread = currentThread;
                    if (!activeThread) {
                      return (
                        <div className="text-sm text-gray-500 text-center py-6">
                          Select a topic from the left to view the discussion.
                        </div>
                      );
                    }
                    return (
                      <>
                        <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <img
                              src={getProfileImageUrl(
                                getSenderAvatar(activeThread.root),
                                apiBase,
                                defaultAvatar
                              )}
                              alt="Profile"
                              className="w-10 h-10 rounded-full object-cover border"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = defaultAvatar;
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex justify-between flex-wrap gap-2">
                                <div>
                                  <p className="font-semibold text-gray-900">{getSenderDisplayName(activeThread.root)}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatForumTimestamp(activeThread.root.createdAt, true)}
                                  </p>
                                </div>
                                {activeThread.root.title && (
                                  <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-1 rounded-full">
                                    Topic
                                  </span>
                                )}
                              </div>
                              {activeThread.root.message && (
                                <p className="mt-3 text-gray-800 whitespace-pre-wrap">{activeThread.root.message}</p>
                              )}
                              {renderAttachmentPreview(
                                activeThread.root,
                                activeThread.root.senderId === currentUserId
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {activeThread.replies.length > 0 ? (
                            [...activeThread.replies]
                              .sort(
                                (a, b) =>
                                  new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt)
                              )
                              .map((reply) => (
                                <div key={reply._id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                                  <div className="flex items-start gap-3">
                                    <img
                                      src={getProfileImageUrl(
                                        getSenderAvatar(reply),
                                        apiBase,
                                        defaultAvatar
                                      )}
                                      alt="Profile"
                                      className="w-8 h-8 rounded-full object-cover border"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = defaultAvatar;
                                      }}
                                    />
                                    <div className="flex-1">
                                      <div className="flex justify-between text-sm text-gray-600">
                                        <span className="font-semibold text-gray-900">{getSenderDisplayName(reply)}</span>
                                        <span className="text-xs text-gray-500">
                                          {formatForumTimestamp(reply.createdAt || reply.updatedAt, true)}
                                        </span>
                                      </div>
                                      {reply.message && (
                                        <p className="mt-2 text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                                      )}
                                      {renderAttachmentPreview(reply, reply.senderId === currentUserId)}
                                    </div>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-6">
                              No replies yet. Start the discussion below.
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="border-t border-gray-200 p-4 space-y-3 bg-white">
                  <textarea
                    value={forumReplyBody}
                    onChange={(e) => setForumReplyBody(e.target.value)}
                    rows={3}
                    placeholder="Write a reply..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  {forumReplyFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {forumReplyFiles.map((file, idx) => (
                        <span
                          key={`${file.name}-${idx}`}
                          className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                        >
                          {file.name}
                          <button onClick={() => removeForumFile("reply", idx)} className="text-red-500 hover:text-red-700">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => forumReplyFileInputRef.current?.click()}
                      >
                        Attach files
                      </button>
                      <input
                        type="file"
                        multiple
                        ref={forumReplyFileInputRef}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.ppt,.pptx"
                        onChange={(e) => handleForumFileSelect(e, "reply")}
                      />
                    </div>
                    <button
                      onClick={handleReplyToThread}
                      disabled={isPostingReply}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isPostingReply ? "Posting..." : "Reply"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Select a topic from the left to view the discussion.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

