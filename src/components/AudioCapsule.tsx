import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Play, Pause, Mic, Square } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { getAssetPath } from '../utils/workspace';

export const AudioCapsule = ({ node, updateAttributes }: NodeViewProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [micError, setMicError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [audioSrc, setAudioSrc] = useState<string | null>(node.attrs.src);
    const filePath = node.attrs.filePath as string;
    // Check existence based on either src or filePath
    const hasRecording = (audioSrc && audioSrc.length > 0) || (filePath && filePath.length > 0);

    // Effect to load source from filePath if needed
    useEffect(() => {
        const loadSrc = async () => {
            if (filePath && !audioSrc) {
                const { convertFileSrc } = await import('@tauri-apps/api/core');
                const url = convertFileSrc(filePath);
                setAudioSrc(url);
                // Optionally update the node's src attribute so it persists too? 
                // But better to keep relying on runtime conversion to be safe.
                if (updateAttributes) {
                    updateAttributes({ src: url });
                }
            } else if (filePath && audioSrc) {
                // Determine if we need to refresh the src? 
                // Asset URLs are usually stable, but let's ensure.
                // For now, assume if we have src, it's good, or the user just recorded it.
                // If this is a fresh load, src might be "asset://..." from previous session.
                // It should work.
            }
        };
        loadSrc();
    }, [filePath]); // Only run if filePath changes (or on mount)

    // Generate stable waveform bars based on node content
    const waveformBars = useMemo(() =>
        Array.from({ length: 32 }, (_, i) =>
            0.3 + Math.sin(i * 0.5) * 0.3 + Math.random() * 0.2
        ), [hasRecording]
    );

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !hasRecording) return;

        const handleTimeUpdate = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [hasRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const stopRecording = async () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }

            // The onstop callback handles the saving logic, but we need to override it essentially or move logic here.
            // mediaRecorder.onstop is async-unfriendly usually.
            // Let's rely on onstop but make it async smart.
        }
    };

    // Initialize media recorder setup differently or just update the onstop handler inside startRecording?
    // Let's update startRecording's onstop handler.

    const startRecording = async () => {
        try {
            setMicError(null); // Clear previous error
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                console.log('[AudioCapsule] Recording stopped. Blob size:', blob.size);

                if (blob.size === 0) {
                    console.error('[AudioCapsule] Blob is empty!');
                    return;
                }

                // Convert blob to number array for Rust
                const arrayBuffer = await blob.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                const content = Array.from(uint8Array);
                console.log('[AudioCapsule] Content length (bytes):', content.length);

                // Generate filename
                const filename = `recording-${Date.now()}.webm`;
                const { invoke } = await import('@tauri-apps/api/core');

                // Get paths (Optimized)
                const filePath = await getAssetPath(filename);

                console.log('[AudioCapsule] Saving audio to:', filePath);

                // Write file
                try {
                    await invoke('write_binary_file', { path: filePath, content });
                    console.log('[AudioCapsule] File written successfully');
                } catch (e) {
                    console.error('[AudioCapsule] Failed to write file:', e);
                }

                // convertFileSrc is needed to play local files in WebView
                const { convertFileSrc } = await import('@tauri-apps/api/core');
                const assetUrl = convertFileSrc(filePath);
                console.log('[AudioCapsule] Asset URL:', assetUrl);

                setAudioSrc(assetUrl); // Update local state immediately
                updateAttributes({
                    src: assetUrl,
                    filePath: filePath
                });
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err: any) {
            console.error('Failed to start recording:', err);
            // Show user-friendly error message
            if (err.name === 'NotFoundError') {
                setMicError('未找到麦克风设备，请连接麦克风后重试');
            } else if (err.name === 'NotReadableError') {
                setMicError('麦克风被占用，请关闭其他使用麦克风的应用');
            } else if (err.name === 'NotAllowedError') {
                setMicError('麦克风权限被拒绝，请在系统设置中允许访问');
            } else {
                setMicError('无法访问麦克风: ' + err.message);
            }
        }
    };


    const togglePlayback = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        audio.currentTime = percentage * duration;
        setProgress(percentage * 100);
    };

    // Recording Mode UI
    if (!hasRecording) {
        return (
            <NodeViewWrapper className="my-4" contentEditable={false} data-drag-handle>
                <div className="inline-flex items-center gap-3 p-3 pr-5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm">
                    {isRecording ? (
                        <>
                            {/* Recording indicator */}
                            <button
                                onClick={stopRecording}
                                className="shrink-0 w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors animate-pulse"
                                aria-label="Stop recording"
                            >
                                <Square className="w-4 h-4" />
                            </button>

                            {/* Recording wave animation */}
                            <div className="flex items-center gap-0.5 h-8" style={{ minWidth: '160px' }}>
                                {Array.from({ length: 32 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1 rounded-full bg-red-400"
                                        style={{
                                            height: `${30 + Math.sin(Date.now() / 200 + i * 0.5) * 30}%`,
                                            animation: 'pulse 0.5s ease-in-out infinite',
                                            animationDelay: `${i * 30}ms`
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Recording time */}
                            <span className="text-xs text-red-500 tabular-nums ml-1 font-medium">
                                {formatTime(recordingTime)}
                            </span>
                        </>
                    ) : (
                        <>
                            {/* Start recording button */}
                            <button
                                onClick={startRecording}
                                className="shrink-0 w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                                aria-label="Start recording"
                            >
                                <Mic className="w-4 h-4" />
                            </button>

                            {micError ? (
                                /* Error message */
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-red-500 max-w-[160px]">{micError}</span>
                                </div>
                            ) : (
                                /* Placeholder waveform */
                                <div className="flex items-center gap-0.5 h-8" style={{ minWidth: '160px' }}>
                                    {Array.from({ length: 32 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1 rounded-full bg-stone-300 dark:bg-stone-600"
                                            style={{ height: '30%' }}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </NodeViewWrapper>
        );
    }

    // Playback Mode UI
    return (
        <NodeViewWrapper className="my-4" contentEditable={false} data-drag-handle>
            <div className="inline-flex items-center gap-3 p-3 pr-5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-md transition-shadow group">
                {/* Hidden audio element */}
                <audio ref={audioRef} src={audioSrc || undefined} preload="metadata" />

                {/* Play/Pause Button */}
                <button
                    onClick={togglePlayback}
                    className="shrink-0 w-10 h-10 rounded-full bg-stone-800 dark:bg-stone-200 text-stone-100 dark:text-stone-800 flex items-center justify-center hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? (
                        <Pause className="w-4 h-4" />
                    ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                    )}
                </button>

                {/* Waveform Visualization */}
                <div
                    className="relative flex items-center gap-0.5 h-8 cursor-pointer select-none"
                    onClick={handleWaveformClick}
                    style={{ minWidth: '160px' }}
                >
                    {waveformBars.map((height, i) => {
                        const barProgress = (i / waveformBars.length) * 100;
                        const isActive = barProgress < progress;
                        return (
                            <div
                                key={i}
                                className={`w-1 rounded-full transition-colors ${isActive
                                    ? 'bg-stone-800 dark:bg-stone-200'
                                    : 'bg-stone-300 dark:bg-stone-600'
                                    }`}
                                style={{ height: `${height * 100}%` }}
                            />
                        );
                    })}
                </div>

                {/* Duration */}
                <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums ml-1">
                    {duration ? formatTime(duration) : '0:00'}
                </span>
            </div>
        </NodeViewWrapper>
    );
};
