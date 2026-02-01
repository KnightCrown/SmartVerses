import React, { useEffect, useState } from 'react';
import { checkForUpdatesOnStartup, downloadAndInstallUpdate, UpdateInfo, saveSkippedVersion } from '../utils/updater';

interface UpdateNotificationProps {
  checkOnMount?: boolean;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ 
  checkOnMount = true 
}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showNotification, setShowNotification] = useState(true);

  const CHANGELOG_URL = 'https://github.com/crownemmanuel/SmartVerses/blob/main/CHANGELOG.md';

  useEffect(() => {
    if (checkOnMount) {
      checkForUpdatesOnStartup().then(result => {
        if (result.available && result.update) {
          setUpdateAvailable(true);
          setUpdateInfo(result.update);
        }
      });
    }
  }, [checkOnMount]);

  const handleUpdate = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    
    await downloadAndInstallUpdate((downloaded, total) => {
      const percent = Math.round((downloaded / total) * 100);
      setDownloadProgress(percent);
    });
    
    // If we get here, the update failed (successful update causes relaunch)
    setIsDownloading(false);
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  const handleSkipVersion = () => {
    if (updateInfo?.version) {
      saveSkippedVersion(updateInfo.version);
      console.log(`[UpdateNotification] Skipped version ${updateInfo.version}`);
    }
    setShowNotification(false);
  };

  const handleViewChangelog = async () => {
    try {
      const opener = await import("@tauri-apps/plugin-opener");
      await opener.openUrl(CHANGELOG_URL);
    } catch (error) {
      console.warn("[UpdateNotification] Failed to open changelog via opener:", error);
      window.open(CHANGELOG_URL, "_blank", "noopener,noreferrer");
    }
  };

  if (!updateAvailable || !showNotification) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.notification}>
        <div style={styles.header}>
          <span style={styles.icon}>⬆️</span>
          <h3 style={styles.title}>Update Available</h3>
        </div>
        
        <p style={styles.version}>
          Version {updateInfo?.version} is ready to install
        </p>
        
        {updateInfo?.body && (
          <p style={styles.body}>{updateInfo.body}</p>
        )}
        
        <button
          onClick={handleViewChangelog}
          style={styles.changelogLink}
          type="button"
        >
          View changelog
        </button>
        
        {isDownloading ? (
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${downloadProgress}%`
                }}
              />
            </div>
            <span style={styles.progressText}>{downloadProgress}%</span>
          </div>
        ) : (
          <div style={styles.buttons}>
            <button
              onClick={handleUpdate}
              style={styles.updateButton}
              type="button"
            >
              Update now
            </button>
            <div style={styles.secondaryRow}>
              <button
                onClick={handleDismiss}
                style={styles.dismissButton}
                type="button"
              >
                Later
              </button>
              <button
                onClick={handleSkipVersion}
                style={styles.skipButton}
                type="button"
              >
                Skip this version
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  notification: {
    backgroundColor: '#121416',
    borderRadius: '14px',
    padding: '24px',
    maxWidth: '420px',
    width: '92%',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
    border: '1px solid #23262b',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  icon: {
    fontSize: '20px',
    color: '#9aa4af',
  },
  title: {
    margin: 0,
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 600,
  },
  version: {
    color: '#b3bac3',
    fontSize: '14px',
    margin: '0 0 16px 0',
  },
  body: {
    color: '#cfd6dd',
    fontSize: '14px',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  changelogLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    color: '#8bb7ff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: '18px',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  secondaryRow: {
    display: 'flex',
    gap: '10px',
  },
  updateButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  dismissButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#1b1f24',
    color: '#c4cbd3',
    border: '1px solid #2a2f36',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  skipButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#9aa4af',
    border: '1px solid #2a2f36',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#23262b',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease',
  },
  progressText: {
    color: '#b3bac3',
    fontSize: '14px',
    fontWeight: 500,
    minWidth: '40px',
    textAlign: 'right',
  },
};

export default UpdateNotification;
