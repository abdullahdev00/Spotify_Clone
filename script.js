const currentsong = new Audio();
let songs = []; // ✅ Initialize as empty array instead of undefined
let currentFolder;
let ul = document.querySelector(".songlist ul");
let noData = document.getElementById("noData");

// ✅ Wait for DOM to load before selecting elements
document.addEventListener('DOMContentLoaded', function() {
    // Elements should be selected after DOM is loaded
    window.play = document.getElementById("play");
    window.previous = document.getElementById("previous");
    window.next = document.getElementById("next");
    
    console.log("DOM loaded, elements:", {
        play: window.play,
        previous: window.previous, 
        next: window.next
    });
    
    // Remove the main() call from here since it's now in DOMContentLoaded
// main();
});

// ✅ Remove these from global scope since we'll set them after DOM loads
// const play = document.getElementById("play");
// const previous = document.getElementById("previous");
// const next = document.getElementById("next");

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

async function getsongs(folder) {
    currentFolder = folder;
    console.log("Getting songs for folder:", folder);
    
    let a = await fetch(`http://127.0.0.1:3000/${folder}/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a");

    songs = []; // ✅ Reset global songs array
    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            songs.push(element.href.split(`/${folder}/`)[1]);
        }
    }
    
    console.log("Songs found in", folder, ":", songs);

    let songul = document.querySelector(".songlist").getElementsByTagName("ul")[0];
    songul.innerHTML = ""; // clear old songs

    // Show/hide noData Lottie
    if (songs.length === 0) {
        noData.style.display = "block";
        console.log("No songs found, showing noData");
        return songs; // ✅ Return empty array
    } else {
        noData.style.display = "none";
        // Reset all song icons to play by default
        document.querySelectorAll(".songlist li .playnow-btn").forEach(btn => {
            btn.src = "images/playbtnbar.svg";
        });
    }

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
                    // ✅ Update clicked li button to pause
                    li.querySelector(".playnow-btn").src = "images/pause.svg";
                } else {
                    currentsong.pause();
                    window.play.src = "images/playbtnbar.svg";
                    // ✅ Update clicked li button to play
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
    return songs; // ✅ Return the songs array
}

// ✅ Fixed playMusic function with correct pause logic
const playMusic = (track, pause = false) => {
    currentsong.pause();
    currentsong.src = `/${currentFolder}/` + track;
    currentsong.load();

    currentsong.addEventListener("loadedmetadata", () => {
        let currentTime = formatTime(currentsong.currentTime);
        let duration = formatTime(currentsong.duration);
        document.querySelector(".songtime").innerHTML = `${currentTime} / ${duration}`;
    }, { once: true });

    // ✅ Fixed logic - if pause is true, don't play
    if (!pause) {
        currentsong.play();
        window.play.src = "images/pause.svg";
    } else {
        // ✅ If paused, show play button
        window.play.src = "images/playbtnbar.svg";
    }

    let cleanedName = cleanFilename(track);
    document.querySelector(".songinfo").innerHTML = `
      <div class="scroll-wrapper">
        <div class="scrolling-text">
          <span>${cleanedName}&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span>${cleanedName}&nbsp;&nbsp;&nbsp;&nbsp;</span>
        </div>
      </div>`;

    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";

    // highlight current song and update all buttons
    document.querySelectorAll(".songlist li").forEach(li => {
        let btn = li.querySelector(".playnow-btn");
        if (li.getAttribute("data-filename") === track) {
            li.classList.add("playing");
            // ✅ Show correct button based on play state
            btn.src = pause ? "images/playbtnbar.svg" : "images/pause.svg";
        } else {
            li.classList.remove("playing");
            btn.src = "images/playbtnbar.svg";
        }
    });
};

async function displayAlbum() {
    console.log("Loading albums...");
    let a = await fetch(`http://127.0.0.1:3000/songs/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;

    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");
    cardContainer.innerHTML = ""; // ✅ Clear existing cards

    let loadedCards = 0;
    for (let anchor of anchors) {
        if (anchor.href.includes("/songs") && !anchor.href.endsWith("/songs/")) {
            let folder = anchor.href.split("/").slice(-2)[0];
            console.log("Processing folder:", folder);
            
            try {
                let metadataRes = await fetch(`http://127.0.0.1:3000/songs/${folder}/info.json`);
                let metadata = await metadataRes.json();

                cardContainer.innerHTML += `
                    <div data-folder="${folder}" class="card">
                        <div class="circle-container">
                            <img class="svg" src="/images/play.svg" alt="">
                        </div>
                        <img src="/songs/${folder}/cover.jpg" alt="songsjpg">
                        <h2>${metadata.title}</h2>
                        <p class="ellipsise">${metadata.description}</p>
                    </div>`;
                
                loadedCards++;
                console.log("Loaded card for folder:", folder);
            } catch (error) {
                console.error(`Metadata error for ${folder}:`, error);
                
                // ✅ Add card even without metadata
                cardContainer.innerHTML += `
                    <div data-folder="${folder}" class="card">
                        <div class="circle-container">
                            <img class="svg" src="/images/play.svg" alt="">
                        </div>
                        <img src="/songs/${folder}/cover.jpg" alt="songsjpg" onerror="this.src='/images/default-cover.jpg'">
                        <h2>${folder.replace(/_/g, ' ')}</h2>
                        <p class="ellipsise">Music Collection</p>
                    </div>`;
                
                loadedCards++;
            }
        }
    }
    
    console.log("Total cards loaded:", loadedCards);
    return loadedCards;
}

async function main() {
    // ✅ Try to load songs from a folder that actually exists
    console.log("Starting main function...");
    
    // First try to get available folders
    try {
        let a = await fetch(`http://127.0.0.1:3000/songs/`);
        let response = await a.text();
        let div = document.createElement("div");
        div.innerHTML = response;
        let anchors = div.getElementsByTagName("a");
        
        let availableFolders = [];
        for (let anchor of anchors) {
            if (anchor.href.includes("/songs") && !anchor.href.endsWith("/songs/")) {
                let folder = anchor.href.split("/").slice(-2)[0];
                availableFolders.push(folder);
            }
        }
        
        console.log("Available folders:", availableFolders);
        
        // ✅ Load songs from first available folder instead of hardcoded "songs/cs"
        if (availableFolders.length > 0) {
            const firstFolder = availableFolders[0];
            console.log("Loading songs from first available folder:", firstFolder);
            songs = await getsongs(`songs/${firstFolder}`);
        } else {
            console.log("No folders found, loading empty songs");
            songs = [];
        }
        
    } catch (error) {
        console.error("Error loading folders:", error);
        // Fallback to original logic
        songs = await getsongs("songs/cs");
    }

    console.log("Initial songs loaded:", songs);

    // ✅ Load albums first, then load songs from first available folder
    const cardsLoaded = await displayAlbum();
    
    // ✅ If no songs loaded initially, try to load from first card
    if ((!songs || songs.length === 0) && cardsLoaded > 0) {
        const firstCard = document.querySelector('.card');
        if (firstCard) {
            const firstFolder = firstCard.dataset.folder;
            console.log("No initial songs, loading from first card folder:", firstFolder);
            songs = await getsongs(`songs/${firstFolder}`);
            firstCard.classList.add("active");
        }
    } else {
        // ✅ Activate the first card that matches loaded songs
        let firstCard = document.querySelector('.card');
        if (firstCard) {
            firstCard.classList.add("active");
            console.log("Activated first card:", firstCard.dataset.folder);
        }
    }

    // ✅ Debug: Check if elements exist
    console.log("Play element:", window.play);
    console.log("Previous element:", window.previous);
    console.log("Next element:", window.next);
    console.log("Songs array after loading:", songs);

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

        // ✅ Update playlist icons when main play button is clicked
        document.querySelectorAll(".songlist li").forEach(li => {
            const isCurrent = li.getAttribute("data-filename") === currentsong.src.split("/").pop();
            const btn = li.querySelector(".playnow-btn");
            if (isCurrent) {
                btn.src = currentsong.paused ? "images/playbtnbar.svg" : "images/pause.svg";
            }
        });
    });

    currentsong.addEventListener("loadedmetadata", () => {
        let currentTime = formatTime(currentsong.currentTime);
        let duration = formatTime(currentsong.duration);
        document.querySelector(".songtime").innerHTML = `${currentTime} / ${duration}`;
    });

    currentsong.addEventListener("timeupdate", () => {
        let percent = (currentsong.currentTime / currentsong.duration) * 100;
        let currentTime = formatTime(currentsong.currentTime);
        let duration = formatTime(currentsong.duration);
        document.querySelector(".songtime").innerHTML = `${currentTime} / ${duration}`;
        document.querySelector(".circle").style.left = percent + "%";
        document.querySelector(".progress").style.width = percent + "%";
    });

    document.querySelector(".seekbar").addEventListener("click", e => {
        let seekbar = e.target.closest(".seekbar");
        let percent = (e.offsetX / seekbar.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        document.querySelector(".progress").style.width = percent + "%";
        currentsong.currentTime = (currentsong.duration * percent) / 100;
    });

    currentsong.addEventListener("ended", () => {
        window.play.src = "images/playbtnbar.svg";
        // ✅ Also update playlist button when song ends
        document.querySelectorAll(".songlist li").forEach(li => {
            const isCurrent = li.getAttribute("data-filename") === currentsong.src.split("/").pop();
            if (isCurrent) {
                li.querySelector(".playnow-btn").src = "images/playbtnbar.svg";
            }
        });
    });

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

    // ✅ Previous button event listener - with proper error handling
    if (window.previous) {
        window.previous.addEventListener("click", () => {
            console.log("Previous clicked");
            console.log("Songs array:", songs);
            console.log("Current song src:", currentsong.src);
            
            // ✅ Check if songs array exists and has items
            if (!songs || songs.length === 0) {
                console.error("Songs array is empty or undefined");
                console.error("Current songs variable:", songs);
                console.error("Type of songs:", typeof songs);
                console.error("Current folder:", currentFolder);
                showToast("⚠️ No songs loaded!");
                return;
            }
            
            // ✅ Check if current song is playing
            if (!currentsong.src) {
                console.error("No current song");
                showToast("⚠️ No song is currently loaded!");
                return;
            }
            
            let currentSongName = currentsong.src.split("/").pop();
            let index = songs.indexOf(currentSongName);
            
            console.log("Current song name:", currentSongName);
            console.log("Current index:", index);
            
            if (index === -1) {
                console.error("Current song not found in songs array");
                showToast("⚠️ Current song not found in playlist!");
                return;
            }
            
            if ((index - 1) >= 0) {
                playMusic(songs[index - 1]);
            } else {
                setTimeout(() => showToast("⏮️ You're already on the first song!"), 500);
            }
        });
    } else {
        console.error("Previous button not found!");
    }

    // ✅ Next button event listener - with proper error handling
    if (window.next) {
        window.next.addEventListener("click", () => {
            console.log("Next clicked");
            console.log("Songs array:", songs);
            console.log("Current song src:", currentsong.src);
            
            // ✅ Check if songs array exists and has items
            if (!songs || songs.length === 0) {
                console.error("Songs array is empty or undefined");
                console.error("Current songs variable:", songs);
                console.error("Type of songs:", typeof songs);
                console.error("Current folder:", currentFolder);
                showToast("⚠️ No songs loaded!");
                return;
            }
            
            // ✅ Check if current song is playing
            if (!currentsong.src) {
                console.error("No current song");
                showToast("⚠️ No song is currently loaded!");
                return;
            }
            
            let currentSongName = currentsong.src.split("/").pop();
            let index = songs.indexOf(currentSongName);
            
            console.log("Current song name:", currentSongName);
            console.log("Current index:", index);
            
            if (index === -1) {
                console.error("Current song not found in songs array");
                showToast("⚠️ Current song not found in playlist!");
                return;
            }
            
            if ((index + 1) < songs.length) {
                playMusic(songs[index + 1]);
            } else {
                setTimeout(() => {
                    showToast("⏭️ You're already on the last song! Starting again...");
                    playMusic(songs[0]);
                }, 500);
            }
        });
    } else {
        console.error("Next button not found!");
    }

    document.querySelector(".cardContainer").addEventListener("click", async (event) => {
        let card = event.target.closest(".card");
        if (card) {
            document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            let folder = card.dataset.folder;
            console.log("Switching to folder:", folder);
            
            // ✅ Properly wait for and assign songs
            const newSongs = await getsongs(`songs/${folder}`);
            songs = newSongs; // ✅ Ensure global songs is updated
            
            console.log("New songs loaded and assigned:", songs);
            console.log("Global songs variable:", songs);
        }
    });
}
}
main();