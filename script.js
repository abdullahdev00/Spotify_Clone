const currentsong = new Audio();
let songs;
let currentFolder;
let ul = document.querySelector(".songlist ul");
let noData = document.getElementById("noData");

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
    let a = await fetch(`http://127.0.0.1:3000/${folder}/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a");

    songs = [];
    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            songs.push(element.href.split(`/${folder}/`)[1]);
        }
    }

    let songul = document.querySelector(".songlist").getElementsByTagName("ul")[0];
    songul.innerHTML = ""; // clear old songs

    // Show/hide noData Lottie
    if (songs.length === 0) {
        noData.style.display = "block";
        return;
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

    playMusic(songs[0], true);

    // attach event listener to each song item
    document.querySelectorAll(".songlist li").forEach(li => {
        li.addEventListener("click", () => {
            const filename = li.getAttribute("data-filename");

            // If same song clicked again
            if (currentsong.src.includes(filename)) {
                if (currentsong.paused) {
                    currentsong.play();
                    play.src = "images/pause.svg";
                    // li.querySelector(".playnow-btn").src = "images/pause.svg";issue
                    
                    } else {
                        currentsong.pause();
                        play.src = "images/playbtnbar.svg";
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

}

const playMusic = (track, pause = false) => {
    currentsong.pause();
    currentsong.src = `/${currentFolder}/` + track;
    currentsong.load();

    currentsong.addEventListener("loadedmetadata", () => {
        let currentTime = formatTime(currentsong.currentTime);
        let duration = formatTime(currentsong.duration);
        document.querySelector(".songtime").innerHTML = `${currentTime} / ${duration}`;
    }, { once: true });

    if (!pause) {
        currentsong.play();
        play.src = "images/pause.svg";
    } else {
        play.src = "images/playbtnbar.svg";
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
            btn.src = "images/pause.svg";
        } else {
            li.classList.remove("playing");
            btn.src = "images/playbtnbar.svg";
        }
    });
};

async function displayAlbum() {
    let a = await fetch(`http://127.0.0.1:3000/songs/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;

    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");

    for (let anchor of anchors) {
        if (anchor.href.includes("/songs")) {
            let folder = anchor.href.split("/").slice(-2)[0];
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
            } catch (error) {
                console.error(`Metadata error: ${folder}`, error);
            }
        }
    }
}

async function main() {
    songs = await getsongs("songs/cs");

    await displayAlbum();

    const firstCard = document.querySelector(`.card[data-folder="Angry_(mood)"]`);
    if (firstCard) {
        firstCard.classList.add("active");
    }

    play.addEventListener("click", () => {
        if (currentsong.paused) {
            currentsong.play();
            play.src = "images/pause.svg";
        } else {
            currentsong.pause();
            play.src = "images/playbtnbar.svg";
        }

        // toggle icons in playlist
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
        play.src = "images/playbtnbar.svg";
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

    previous.addEventListener("click", () => {
        let index = songs.indexOf(currentsong.src.split("/").pop());
        if ((index - 1) >= 0) {
            playMusic(songs[index - 1]);
        } else {
            setTimeout(() => showToast("⏮️ You're already on the first song!"), 500);
        }
    });

    next.addEventListener("click", () => {
        let index = songs.indexOf(currentsong.src.split("/").pop());
        if ((index + 1) < songs.length) {
            playMusic(songs[index + 1]);
        } else {
            setTimeout(() => {
                showToast("⏭️ You're already on the last song! Starting again...");
                playMusic(songs[0]);
            }, 500);
        }
    });

    document.querySelector(".cardContainer").addEventListener("click", async (event) => {
        let card = event.target.closest(".card");
        if (card) {
            document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            let folder = card.dataset.folder;
            songs = await getsongs(`songs/${folder}`);
        }
    });
}

main();
