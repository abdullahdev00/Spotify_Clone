const baseBlobUrl = "https://spotifyclone.blob.core.windows.net";
const currentsong = new Audio();
let songs = []; // ✅ Initialize as empty array instead of undefined
let currentFolder;
let ul = document.querySelector(".songlist ul");
let noData = document.getElementById("noData");

// ✅ Wait for DOM to load before selecting elements
document.addEventListener('DOMContentLoaded', function () {
    // Elements should be selected after DOM is loaded
    window.play = document.getElementById("play");
    window.previous = document.getElementById("previous");
    window.next = document.getElementById("next");

    console.log("DOM loaded, elements:", {
        play: window.play,
        previous: window.previous,
        next: window.next
    });

    // Call main() after DOM is loaded
    main();
});

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    let minutes = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);
    if (minutes < 10) minutes = "0" + minutes;
    if (secs < 10) secs = "0" + secs;
    return `${minutes}:${secs}`;
}

function cleanFilename(filename) {
    return decodeURIComponent(filename)
        .replace(".mp3", "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[()]/g, "")
        .replace(/\n/g, "")
        .replace(/\r/g, "")
        .trim();
}

// ✅ FIXED: Updated getsongs function to properly handle Azure blob structure
async function getsongs(folder) {
    currentFolder = folder;
    console.log("Getting songs for folder:", folder);

    try {
        // ✅ Try to load from info.json first (if it exists)
        let response = await fetch(`${baseBlobUrl}/${folder}/info.json`);

        if (response.ok) {
            // ✅ If info.json exists, use it
            let albumInfo = await response.json();
            console.log("Found info.json for", folder, ":", albumInfo);

            songs = [];
            if (albumInfo.songs && Array.isArray(albumInfo.songs)) {
                for (let song of albumInfo.songs) {
                    if (song.file && song.file.endsWith('.mp3')) {
                        songs.push(song.file);
                    }
                }
            }
        } else {
            // ✅ Fallback: Try to fetch directory listing
            console.log("No info.json found, trying directory listing...");
            let dirResponse = await fetch(`${baseBlobUrl}/${folder}/`);
            let dirText = await dirResponse.text();

            let div = document.createElement("div");
            div.innerHTML = dirText;
            let links = div.getElementsByTagName("a");

            songs = [];
            for (let i = 0; i < links.length; i++) {
                let href = links[i].href;
                if (href && href.endsWith(".mp3")) {
                    let filename = href.split('/').pop();
                    songs.push(filename);
                }
            }
        }
    } catch (error) {
        console.error("Error loading songs from", folder, ":", error);
        songs = [];
    }

    console.log("Songs found in", folder, ":", songs);

    let songul = document.querySelector(".songlist").getElementsByTagName("ul")[0];
    songul.innerHTML = ""; // clear old songs

    // Show/hide noData Lottie
    if (songs.length === 0) {
        noData.style.display = "block";
        console.log("No songs found, showing noData");
        return songs;
    } else {
        noData.style.display = "none";
        // Reset all song icons to play by default
        document.querySelectorAll(".songlist li .playnow-btn").forEach(btn => {
            btn.src = "images/playbtnbar.svg";
        });
    }

    // ✅ Display songs in the UI
    for (const song of songs) {
        let cleanedName = cleanFilename(song);

        songul.innerHTML += `<li class="flex rounded" data-filename="${song}">
            <img class="musicsvg" src="/images/music.svg" alt="musicsvg">
            <div class="info">
                <div class="songname">${cleanedName}</div>
            </div>
            <div class="playnow flex">
                <img class="playnow-btn" src="/images/playbtnbar.svg" alt="playnow">
            </div>
        </li>`;
    }

    // ✅ Load first song but don't play it automatically
    if (songs.length > 0) {
        playMusic(songs[0], true);
    }

    // attach event listener to each song item
    document.querySelectorAll(".songlist li").forEach(li => {
        li.addEventListener("click", () => {
            const filename = li.getAttribute("data-filename");

            // If same song clicked again
            if (currentsong.src.includes(filename)) {
                if (currentsong.paused) {
                    currentsong.play();
                    window.play.src = "images/pause.svg";
                    li.querySelector(".playnow-btn").src = "images/pause.svg";
                } else {
                    currentsong.pause();
                    window.play.src = "images/playbtnbar.svg";
                    li.querySelector(".playnow-btn").src = "images/playbtnbar.svg";
                }
            } else {
                playMusic(filename); // new song
            }

            // Update SVGs of other list items
            document.querySelectorAll(".songlist li").forEach(otherLi => {
                const btn = otherLi.querySelector(".playnow-btn");
                if (otherLi !== li) {
                    otherLi.classList.remove("playing");
                    btn.src = "images/playbtnbar.svg";
                }
            });
        });
    });

    console.log("Returning songs:", songs);
    return songs;
}

// ✅ FIXED: Updated playMusic function with better metadata handling
const playMusic = (track, pause = false) => {
    console.log("🎵 Playing:", track, "Pause:", pause);

    currentsong.pause();
    currentsong.src = `${baseBlobUrl}/${currentFolder}/${track}`;
    currentsong.load();

    // ✅ Better metadata handling with timeout fallback
    function updateSongInfo() {
        let currentTime = formatTime(currentsong.currentTime);
        let duration = formatTime(currentsong.duration);
        let songtimeElement = document.querySelector(".songtime");

        if (songtimeElement) {
            songtimeElement.innerHTML = `${currentTime} / ${duration}`;
        }

        console.log("Song info updated:", currentTime, "/", duration);
    }

    // Try to update immediately if metadata is already loaded
    if (currentsong.duration && !isNaN(currentsong.duration)) {
        updateSongInfo();
    } else {
        // Wait for metadata to load
        currentsong.addEventListener("loadedmetadata", updateSongInfo, { once: true });

        // Fallback timeout in case metadata doesn't load
        setTimeout(() => {
            if (currentsong.duration && !isNaN(currentsong.duration)) {
                updateSongInfo();
            } else {
                let songtimeElement = document.querySelector(".songtime");
                if (songtimeElement) {
                    songtimeElement.innerHTML = "00:00 / 00:00";
                }
            }
        }, 1000);
    }

    if (!pause) {
        currentsong.play();
        window.play.src = "images/pause.svg";
    } else {
        window.play.src = "images/playbtnbar.svg";
    }

    let cleanedName = cleanFilename(track);
    let songinfoElement = document.querySelector(".songinfo");
    if (songinfoElement) {
        songinfoElement.innerHTML = `
          <div class="scroll-wrapper">
            <div class="scrolling-text">
              <span>${cleanedName}&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span>${cleanedName}&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </div>
          </div>`;
    }

    // ✅ Reset progress bar
    let circleElement = document.querySelector(".circle");
    let progressElement = document.querySelector(".progress");
    if (circleElement && progressElement) {
        circleElement.style.left = "0%";
        progressElement.style.width = "0%";
    }

    // highlight current song and update all buttons
    document.querySelectorAll(".songlist li").forEach(li => {
        let btn = li.querySelector(".playnow-btn");
        if (li.getAttribute("data-filename") === track) {
            li.classList.add("playing");
            btn.src = pause ? "images/playbtnbar.svg" : "images/pause.svg";
        } else {
            li.classList.remove("playing");
            btn.src = "images/playbtnbar.svg";
        }
    });
};

// ✅ FIXED: Simplified album loading function
const AZURE_BASE = "https://spotifyclone.blob.core.windows.net/songs";
async function loadAlbums() {
    console.log("Loading albums from Azure...");

    // ✅ You can either hardcode known albums or try to discover them
    let albums = ["Angry_(mood)", "Bright_(mood)", "Diljit"]; // Add more as needed

    for (let album of albums) {
        try {
            console.log(`Checking album: ${album}`);

            // ✅ Try to load info.json for this album
            let response = await fetch(`${AZURE_BASE}/${album}/info.json`);

            if (response.ok) {
                let albumInfo = await response.json();
                console.log(`✅ Loaded album info for ${album}:`, albumInfo);

                // ✅ You can use this info to display album cards or details
                // This is just for verification - the actual UI cards are created in displayAlbum()
            } else {
                console.log(`ℹ️ No info.json found for ${album}, will try direct loading`);
            }

        } catch (err) {
            console.error(`❌ Error checking album "${album}":`, err);
        }
    }
}

// ✅ FIXED: Corrected displayAlbum function
async function displayAlbum() {
    console.log("Creating album cards...");
    
    let cardContainer = document.querySelector(".cardContainer");
    if (!cardContainer) {
        console.error("❌ .cardContainer not found!");
        return 0;
    }
    
    cardContainer.innerHTML = ""; // Clear existing cards
    
    // ✅ Fetch albums from your Azure storage
    let albums = [];

    try {
        // ✅ Use your correct base URL instead of placeholder
        let res = await fetch(`${baseBlobUrl}/songs/albums/albums.json`);
        
        if (res.ok) {
            albums = await res.json();
            console.log("✅ Albums loaded from albums.json:", albums);
        } else {
            console.log("ℹ️ albums.json not found, using fallback albums");
            // ✅ Fallback to hardcoded albums if albums.json doesn't exist
            albums = [
                {
                    folder: "Angry_(mood)",
                    title: "Angry Mood",
                    description: "Intense and powerful tracks",
                    cover: "cover.jpg"
                },
                {
                    folder: "Bright_(mood)", 
                    title: "Bright Mood",
                    description: "Uplifting and energetic songs",
                    cover: "cover.jpg"
                },
                {
                    folder: "Diljit",
                    title: "Diljit Collection",
                    description: "Best of Diljit Dosanjh",
                    cover: "cover.jpg"
                }
            ];
        }
    } catch (error) {
        console.error("❌ Error fetching albums:", error);
        // ✅ Use fallback albums on any error
        albums = [
            {
                folder: "Angry_(mood)",
                title: "Angry Mood", 
                description: "Intense and powerful tracks",
                cover: "cover.jpg"
            },
            {
                folder: "Bright_(mood)",
                title: "Bright Mood",
                description: "Uplifting and energetic songs", 
                cover: "cover.jpg"
            },
            {
                folder: "Diljit",
                title: "Diljit Collection",
                description: "Best of Diljit Dosanjh",
                cover: "cover.jpg"
            }
        ];
    }
    
    let cardsCreated = 0;
    
    for (let album of albums) {
        try {
            // ✅ Create card HTML
            let cardHTML = `
                <div data-folder="${album.folder}" class="card">
                    <div class="circle-container">
                        <img class="svg" src="/images/play.svg" alt="">
                    </div>
                    <img src="${baseBlobUrl}/songs/${album.folder}/${album.cover}" 
                         alt="album cover" 
                         onerror="this.src='/images/default-cover.jpg'">
                    <h2>${album.title}</h2>
                    <p class="ellipsise">${album.description}</p>
                </div>`;
            
            cardContainer.innerHTML += cardHTML;
            cardsCreated++;
            console.log(`✅ Created card for ${album.folder}`);
            
        } catch (error) {
            console.error(`❌ Error creating card for ${album.folder}:`, error);
        }
    }
    
    console.log(`Total cards created: ${cardsCreated}`);
    return cardsCreated;
}

// ✅ FIXED: Main function with proper error handling
async function main() {
    console.log("🚀 Starting main function...");

    // ✅ First load the album cards
    const cardsLoaded = await displayAlbum();
    console.log(`Cards loaded: ${cardsLoaded}`);

    // ✅ Then try to load songs from the first available album
    if (cardsLoaded > 0) {
        const firstCard = document.querySelector('.card');
        if (firstCard) {
            const firstFolder = firstCard.dataset.folder;
            console.log(`Loading songs from first album: ${firstFolder}`);

            // ✅ Load songs and wait for completion
            songs = await getsongs(`songs/${firstFolder}`);
            firstCard.classList.add("active");

            console.log(`✅ Loaded ${songs.length} songs from ${firstFolder}`);
        }
    } else {
        console.error("❌ No album cards were created!");
        // ✅ Show fallback message
        if (noData) {
            noData.style.display = "block";
        }
    }

    // ✅ Debug: Check if elements exist
    console.log("Control elements check:", {
        play: window.play,
        previous: window.previous,
        next: window.next,
        songsCount: songs ? songs.length : 0
    });

    // ✅ Main play button event listener
    if (window.play) {
        window.play.addEventListener("click", () => {
            if (currentsong.paused) {
                currentsong.play();
                window.play.src = "images/pause.svg";
            } else {
                currentsong.pause();
                window.play.src = "images/playbtnbar.svg";
            }

            // Update playlist icons when main play button is clicked
            document.querySelectorAll(".songlist li").forEach(li => {
                const isCurrent = li.getAttribute("data-filename") === currentsong.src.split("/").pop();
                const btn = li.querySelector(".playnow-btn");
                if (isCurrent) {
                    btn.src = currentsong.paused ? "images/playbtnbar.svg" : "images/pause.svg";
                }
            });
        });
    }

    // ✅ FIXED: Audio event listeners with proper cleanup and seeking state
    // Remove any existing listeners first
    currentsong.removeEventListener("loadedmetadata", handleLoadedMetadata);
    currentsong.removeEventListener("timeupdate", handleTimeUpdate);

    // ✅ Define seeking state at proper scope
    let isManuallySeking = false;
    let seekTarget = 0;

    // Define handlers outside to avoid duplicates
    function handleLoadedMetadata() {
        let currentTime = formatTime(currentsong.currentTime);
        let duration = formatTime(currentsong.duration);
        let songtimeElement = document.querySelector(".songtime");
        if (songtimeElement) {
            songtimeElement.innerHTML = `${currentTime} / ${duration}`;
        }
        console.log("Metadata loaded - Duration:", duration);
    }

    function handleTimeUpdate() {
        // ✅ Check seeking states to prevent conflicts
        if (currentsong.seeking || isManuallySeking) {
            console.log("⏸️ Skipping timeupdate - seeking in progress");
            return; // Don't update UI while seeking
        }

        if (currentsong.duration && !isNaN(currentsong.duration) && currentsong.duration > 0) {
            let percent = (currentsong.currentTime / currentsong.duration) * 100;
            let currentTime = formatTime(currentsong.currentTime);
            let duration = formatTime(currentsong.duration);

            // Update time display
            let songtimeElement = document.querySelector(".songtime");
            if (songtimeElement) {
                songtimeElement.innerHTML = `${currentTime} / ${duration}`;
            }

            // Update progress bar only if not currently seeking
            let circleElement = document.querySelector(".circle");
            let progressElement = document.querySelector(".progress");

            if (circleElement && progressElement) {
                circleElement.style.left = percent + "%";
                progressElement.style.width = percent + "%";
            }
        }
    }

    // Add the event listeners
    currentsong.addEventListener("loadedmetadata", handleLoadedMetadata);
    currentsong.addEventListener("timeupdate", handleTimeUpdate);

    // ✅ FIXED: Seekbar click handler with proper scope
    let seekbarElement = document.querySelector(".seekbar");
    if (seekbarElement) {
        // Remove existing listener if any
        seekbarElement.removeEventListener("click", handleSeekbarClick);

        function handleSeekbarClick(e) {
            console.log("🎯 Seekbar clicked!");

            // ✅ Check if song is loaded and ready
            if (!currentsong.src) {
                console.log("❌ No song loaded");
                return;
            }

            if (!currentsong.duration || isNaN(currentsong.duration) || currentsong.duration === 0) {
                console.log("❌ Song duration not available:", currentsong.duration);
                return;
            }

            let seekbar = e.currentTarget;
            let rect = seekbar.getBoundingClientRect();
            let clickX = e.clientX - rect.left;
            let percent = (clickX / rect.width) * 100;

            // Clamp percent between 0 and 100
            percent = Math.max(0, Math.min(100, percent));

            // Calculate new time
            let newTime = (currentsong.duration * percent) / 100;
            seekTarget = newTime;

            console.log("📊 Seek Details:", {
                clickX: clickX,
                seekbarWidth: rect.width,
                percent: percent,
                duration: currentsong.duration,
                newTime: newTime,
                formattedTime: formatTime(newTime),
                readyState: currentsong.readyState,
                seekableLength: currentsong.seekable.length,
                seekableRange: currentsong.seekable.length > 0 ? `${currentsong.seekable.start(0)}-${currentsong.seekable.end(0)}` : "none"
            });

            // ✅ AZURE WORKAROUND: For non-seekable streams, we reload with fragment
            if (currentsong.seekable.length === 0 || currentsong.seekable.end(0) === 0) {
                console.log("🔄 Azure stream not seekable, using fragment workaround");

                // Store current play state
                let wasPlaying = !currentsong.paused;
                let currentSrc = currentsong.src;

                // ✅ Set manual seeking flag
                isManuallySeking = true;
                currentsong.removeEventListener("timeupdate", handleTimeUpdate);

                // ✅ Update UI immediately
                updateProgressBar(percent, newTime);

                // ✅ AZURE FRAGMENT WORKAROUND: Add time fragment to URL
                let fragmentUrl = `${currentSrc}#t=${newTime}`;
                console.log("🎬 Loading with time fragment:", fragmentUrl);

                // ✅ Pause current song
                currentsong.pause();

                // ✅ Set new source with time fragment
                currentsong.src = fragmentUrl;
                currentsong.load();

                // ✅ Handle metadata loaded for fragment
                let fragmentLoadHandler = () => {
                    console.log("📊 Fragment loaded, duration:", currentsong.duration);

                    // Set currentTime as close as possible to target
                    if (currentsong.duration && newTime < currentsong.duration) {
                        currentsong.currentTime = newTime;
                        console.log("⏰ Set currentTime to:", newTime, "Actual:", currentsong.currentTime);
                    }

                    // Update display
                    updateProgressBar(percent, newTime);

                    // Resume playback if it was playing
                    if (wasPlaying) {
                        currentsong.play().then(() => {
                            console.log("▶️ Resumed playback at fragment position");
                        }).catch(err => {
                            console.error("❌ Error playing fragment:", err);
                        });
                    }

                    // Re-enable timeupdate
                    setTimeout(() => {
                        isManuallySeking = false;
                        currentsong.addEventListener("timeupdate", handleTimeUpdate);
                        console.log("🔄 Timeupdate re-enabled after fragment load");
                    }, 1000);

                    currentsong.removeEventListener("loadedmetadata", fragmentLoadHandler);
                };

                currentsong.addEventListener("loadedmetadata", fragmentLoadHandler);

                // ✅ Fallback if metadata doesn't load
                setTimeout(() => {
                    if (isManuallySeking) {
                        console.log("⚠️ Fragment timeout, falling back to direct seek");

                        // Try direct currentTime set
                        try {
                            currentsong.currentTime = newTime;
                            updateProgressBar(percent, newTime);
                        } catch (err) {
                            console.error("❌ Direct seek also failed:", err);
                        }

                        // Force enable timeupdate
                        isManuallySeking = false;
                        currentsong.addEventListener("timeupdate", handleTimeUpdate);
                        currentsong.removeEventListener("loadedmetadata", fragmentLoadHandler);
                    }
                }, 3000);

                return; // Exit early for fragment approach
            }

            // ✅ NORMAL SEEKABLE STREAM HANDLING (original code)
            let wasPlaying = !currentsong.paused;

            isManuallySeking = true;
            currentsong.removeEventListener("timeupdate", handleTimeUpdate);

            try {
                // Force immediate visual update BEFORE seeking
                updateProgressBar(percent, newTime);

                // Set currentTime
                currentsong.currentTime = newTime;

                console.log("✅ Set currentTime to:", newTime, "Actual:", currentsong.currentTime);

                // Enhanced seek completion handler
                let seekCompleteHandler = () => {
                    console.log("✅ Normal seek completed at:", formatTime(currentsong.currentTime));

                    // Verify position
                    if (Math.abs(currentsong.currentTime - seekTarget) > 2) {
                        console.log("⚠️ Position mismatch, correcting...");
                        currentsong.currentTime = seekTarget;
                    }

                    // Restore play state
                    if (wasPlaying && currentsong.paused) {
                        currentsong.play();
                    }

                    // Re-enable timeupdate
                    setTimeout(() => {
                        isManuallySeking = false;
                        currentsong.addEventListener("timeupdate", handleTimeUpdate);
                    }, 500);

                    currentsong.removeEventListener("seeked", seekCompleteHandler);
                };

                currentsong.addEventListener("seeked", seekCompleteHandler);

                // Fallback timeout
                setTimeout(() => {
                    if (isManuallySeking) {
                        console.log("⚠️ Normal seek timeout");
                        isManuallySeking = false;
                        currentsong.addEventListener("timeupdate", handleTimeUpdate);
                        currentsong.removeEventListener("seeked", seekCompleteHandler);
                    }
                }, 2000);

            } catch (error) {
                console.error("❌ Error during normal seeking:", error);
                isManuallySeking = false;
                currentsong.addEventListener("timeupdate", handleTimeUpdate);
            }
        }

        // ✅ Helper function to update progress bar
        function updateProgressBar(percent, currentTime) {
            let circleElement = document.querySelector(".circle");
            let progressElement = document.querySelector(".progress");
            let songtimeElement = document.querySelector(".songtime");

            if (circleElement && progressElement) {
                circleElement.style.left = percent + "%";
                progressElement.style.width = percent + "%";
            }

            if (songtimeElement && currentsong.duration) {
                let current = formatTime(currentTime);
                let duration = formatTime(currentsong.duration);
                songtimeElement.innerHTML = `${current} / ${duration}`;
            }
        }

        seekbarElement.addEventListener("click", handleSeekbarClick);

        // ✅ Enhanced seeking event listeners for Azure streams
        currentsong.addEventListener("seeking", () => {
            console.log("🔄 Seeking to:", formatTime(currentsong.currentTime));
        });

        currentsong.addEventListener("seeked", () => {
            console.log("✅ Native seek completed at:", formatTime(currentsong.currentTime));
        });

        // ✅ Handle loading states for Azure streams
        currentsong.addEventListener("waiting", () => {
            console.log("⏳ Azure stream buffering...");
        });

        currentsong.addEventListener("canplay", () => {
            console.log("▶️ Azure stream ready to play");
        });

    } else {
        console.error("❌ Seekbar element not found!");
    }

    currentsong.addEventListener("ended", () => {
        window.play.src = "images/playbtnbar.svg";
        document.querySelectorAll(".songlist li").forEach(li => {
            const isCurrent = li.getAttribute("data-filename") === currentsong.src.split("/").pop();
            if (isCurrent) {
                li.querySelector(".playnow-btn").src = "images/playbtnbar.svg";
            }
        });
    });

    // ✅ Mobile menu controls
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-600px";
    });

    function showToast(message) {
        const toast = document.getElementById("toast");
        toast.innerText = message;
        toast.style.display = "block";
        setTimeout(() => {
            toast.style.display = "none";
        }, 1500);
    }

    // ✅ Previous button event listener
    if (window.previous) {
        window.previous.addEventListener("click", () => {
            if (!songs || songs.length === 0) {
                showToast("⚠️ No songs loaded!");
                return;
            }

            if (!currentsong.src) {
                showToast("⚠️ No song is currently loaded!");
                return;
            }

            let currentSongName = currentsong.src.split("/").pop();
            let index = songs.indexOf(currentSongName);

            if (index === -1) {
                showToast("⚠️ Current song not found in playlist!");
                return;
            }

            if ((index - 1) >= 0) {
                playMusic(songs[index - 1]);
            } else {
                showToast("⏮️ You're already on the first song!");
            }
        });
    }

    // ✅ Next button event listener
    if (window.next) {
        window.next.addEventListener("click", () => {
            if (!songs || songs.length === 0) {
                showToast("⚠️ No songs loaded!");
                return;
            }

            if (!currentsong.src) {
                showToast("⚠️ No song is currently loaded!");
                return;
            }

            let currentSongName = currentsong.src.split("/").pop();
            let index = songs.indexOf(currentSongName);

            if (index === -1) {
                showToast("⚠️ Current song not found in playlist!");
                return;
            }

            if ((index + 1) < songs.length) {
                playMusic(songs[index + 1]);
            } else {
                showToast("⏭️ You're already on the last song! Starting again...");
                playMusic(songs[0]);
            }
        });
    }

    // ✅ FIXED: Card click event listener with proper async handling
    document.querySelector(".cardContainer").addEventListener("click", async (event) => {
        let card = event.target.closest(".card");
        if (card) {
            console.log("🎵 Card clicked:", card.dataset.folder);

            // Update active card
            document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");

            let folder = card.dataset.folder;
            console.log(`Switching to folder: ${folder}`);

            // ✅ Load songs from selected folder and wait for completion
            try {
                const newSongs = await getsongs(`songs/${folder}`);
                songs = newSongs; // Update global songs array

                console.log(`✅ Successfully loaded ${songs.length} songs from ${folder}`);
                console.log("New songs:", songs);

                if (songs.length === 0) {
                    showToast("⚠️ No songs found in this album!");
                }

            } catch (error) {
                console.error(`❌ Error loading songs from ${folder}:`, error);
                showToast("❌ Error loading songs from this album!");
                songs = [];
            }
        }
    });

    console.log("✅ Main function completed successfully!");
}