class MusicPlayer {
    constructor() {
        this.playlist = [
            { title: 'A Rallying Cry of Futility', file: 'Offihito/music1.mp3' },
            { title: 'Ghosts Memories Consciousness', file: 'Offihito/music2.mp3' },
            { title: 'Honey, I Don\'t Feel So Great', file: 'Offihito/music3.mp3' },
            { title: 'Shadow Woman', file: 'Offihito/music4.mp3' },
            { title: 'Vandal', file: 'Offihito/music5.mp3' }
        ];
        
        this.currentIndex = this.getRandomIndex();
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.isVisualizerSetup = false;
        this.useSyntheticData = false;
        this.canvas = null;
        this.canvasCtx = null;
        this.setupCanvas();
        this.setupAudioContext();
        this.init();
    }

    setupCanvas() {
        this.canvas = document.getElementById('visualizer');
        if (this.canvas) {
            this.canvasCtx = this.canvas.getContext('2d');
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            console.log('✓ Canvas setup:', this.canvas.width, 'x', this.canvas.height);
            window.addEventListener('resize', () => {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            });
        } else {
            console.error('Canvas element not found!');
        }
    }

    setupAudioContext() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.log('Web Audio API not supported, using synthetic visualization');
                this.dataArray = new Uint8Array(256);
                this.useSyntheticData = true;
                return;
            }
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.85;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            console.log('✓ Audio context setup, dataArray length:', this.dataArray.length);
        } catch (e) {
            console.log('Error setting up audio context:', e);
            // Fallback: create dummy dataArray for synthetic visualization
            this.dataArray = new Uint8Array(256);
            this.useSyntheticData = true;
        }
    }

    connectAudioElement() {
        if (!this.isVisualizerSetup && this.audioContext && this.audioPlayer) {
            try {
                // Resume audio context if suspended
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // Try to connect MediaElementAudioSource
                try {
                    if (typeof this.audioContext.createMediaElementAudioSource === 'function') {
                        const source = this.audioContext.createMediaElementAudioSource(this.audioPlayer);
                        source.connect(this.analyser);
                        this.analyser.connect(this.audioContext.destination);
                        this.useSyntheticData = false;
                        console.log('✓ Audio source connected successfully');
                    }
                } catch (e) {
                    console.log('createMediaElementAudioSource failed, using fallback:', e.message);
                    this.useSyntheticData = true;
                }
                
                this.isVisualizerSetup = true;
            } catch (e) {
                console.log('Error in connectAudioElement:', e);
                this.useSyntheticData = true;
                this.isVisualizerSetup = true;
            }
        }
    }

    generateSyntheticData() {
        if (!this.audioPlayer || !this.dataArray) return;
        
        const currentTime = this.audioPlayer.currentTime;
        const duration = this.audioPlayer.duration || 1;
        const progress = currentTime / duration;
        
        // Create animated bars based on playback progress
        for (let i = 0; i < this.dataArray.length; i++) {
            // More energetic animation
            const sine = Math.sin((i / this.dataArray.length) * Math.PI + progress * Math.PI * 6) * 100 + 80;
            const wave = Math.sin(currentTime * 2 + (i / this.dataArray.length) * Math.PI * 2) * 60 + 60;
            const random = Math.random() * 50;
            this.dataArray[i] = Math.min(Math.max(sine + wave + random, 20), 255);
        }
    }

    drawVisualizer() {
        if (!this.canvas || !this.canvasCtx) {
            return;
        }

        const width = this.canvas.width;
        const height = this.canvas.height;
        
        if (!width || !height || !isFinite(width) || !isFinite(height)) {
            return;
        }
        
        // Make sure we have data
        if (!this.dataArray || this.dataArray.length === 0) {
            return;
        }
        
        // Eğer müzik çalıyorsa synthetic data kullan (daha güvenilir)
        if (this.audioPlayer && !this.audioPlayer.paused) {
            this.generateSyntheticData();
        } else if (this.analyser && this.isVisualizerSetup) {
            // Müzik çalmıyorsa real audio data al
            try {
                this.analyser.getByteFrequencyData(this.dataArray);
            } catch (e) {
                // Hata olursa synthetic data kullan
                this.generateSyntheticData();
            }
        }
        
        // Clear background - semi-transparent
        this.canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.canvasCtx.fillRect(0, 0, width, height);

        // Draw visualizer bars - responsive to frequency data
        const barCount = 50;
        const barWidth = width / barCount;
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * (this.dataArray.length - 1));
            const frequency = this.dataArray[dataIndex] || 0;
            // Very sensitive - cubic power for dramatic difference between quiet and loud
            const normalized = frequency / 255;
            const barHeight = Math.pow(normalized, 2.5) * height * 0.8;
            const x = i * barWidth;

            // Colorful bar with dynamic brightness based on frequency
            const hue = (i / barCount) * 360;
            const brightness = 20 + (normalized * 80); // 20-100%
            const color = `hsl(${hue}, 100%, ${brightness}%)`;
            
            // Draw bar from bottom up
            this.canvasCtx.fillStyle = color;
            this.canvasCtx.fillRect(x + 2, height - barHeight, barWidth - 4, barHeight);
        }
    }

    getRandomIndex() {
        return Math.floor(Math.random() * this.playlist.length);
    }

    init() {
        const audioPlayer = document.querySelector('.Audio-Player');
        const prevBtn = document.querySelector('.Music-Prev');
        const nextBtn = document.querySelector('.Music-Next');
        const playBtn = document.querySelector('.Music-Play');
        const progressBar = document.querySelector('.Music-Progress');
        const timeDisplay = document.querySelector('.Music-Time');

        if (audioPlayer && prevBtn && nextBtn) {
            this.audioPlayer = audioPlayer;
            this.updatePlayerSource();
            
            prevBtn.addEventListener('click', () => this.playPrevious());
            nextBtn.addEventListener('click', () => this.playNext());
            playBtn.addEventListener('click', () => this.togglePlay());
            
            audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
            audioPlayer.addEventListener('ended', () => this.playNext());
            progressBar.addEventListener('input', (e) => this.seek(e));
            
            // Start visualizer animation loop
            this.startVisualizerLoop();
        }
    }

    startVisualizerLoop() {
        let frameCount = 0;
        const animate = () => {
            frameCount++;
            if (frameCount === 1) {
                console.log('✓ Visualizer loop started');
            }
            this.drawVisualizer();
            requestAnimationFrame(animate);
        };
        animate();
    }

    updatePlayerSource() {
        const songTitle = document.querySelector('.Music-Song-Title');
        const currentSong = this.playlist[this.currentIndex];

        if (this.audioPlayer) {
            const sourceElement = this.audioPlayer.querySelector('source');
            sourceElement.src = currentSong.file;
            this.audioPlayer.load();
        }

        if (songTitle) {
            songTitle.textContent = currentSong.title;
        }
    }

    togglePlay() {
        const playBtn = document.querySelector('.Music-Play');
        const container = document.querySelector('.Container');
        if (this.audioPlayer.paused) {
            this.connectAudioElement();
            this.audioPlayer.play();
            playBtn.textContent = '⏸';
            container.classList.add('playing');
        } else {
            this.audioPlayer.pause();
            playBtn.textContent = '▶';
            container.classList.remove('playing');
        }
    }

    updateProgress() {
        const progressBar = document.querySelector('.Music-Progress');
        const timeDisplay = document.querySelector('.Music-Time');
        
        if (this.audioPlayer.duration) {
            progressBar.value = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
            timeDisplay.textContent = `${this.formatTime(this.audioPlayer.currentTime)} / ${this.formatTime(this.audioPlayer.duration)}`;
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    seek(e) {
        const percentage = e.target.value / 100;
        this.audioPlayer.currentTime = percentage * this.audioPlayer.duration;
    }

    playNext() {
        const container = document.querySelector('.Container');
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.updatePlayerSource();
        this.connectAudioElement();
        this.audioPlayer.play();
        document.querySelector('.Music-Play').textContent = '⏸';
        container.classList.add('playing');
    }

    playPrevious() {
        const container = document.querySelector('.Container');
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.updatePlayerSource();
        this.connectAudioElement();
        this.audioPlayer.play();
        document.querySelector('.Music-Play').textContent = '⏸';
        container.classList.add('playing');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});
