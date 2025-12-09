/* import BlobURLMaker from "../../utils/BlobURLMaker";
import Whentil from "@spikerko/tools/Whentil";
import Global from "../Global/Global";
import Session from "../Global/Session";

// Define interface for navigation data
interface NavigationData {
    pathname: string;
    [key: string]: any;
}

const ThisPageRoot = document.querySelector<HTMLElement>(".Root__main-view") ?? undefined;

// Exit early if root element not found
if (!ThisPageRoot) {
    console.error("PlaylistBGs: Root__main-view element not found");
} else {
    Global.Event.listen("session:navigation", (data: NavigationData) => {
        if (Session.GetPreviousLocation()?.pathname.startsWith("/playlist") && ThisPageRoot.classList.contains("spicy-playlist-bg")) {
            const underMainView = ThisPageRoot.querySelector<HTMLElement>(".under-main-view");
            if (underMainView) {
                underMainView.innerHTML = ``;
                ThisPageRoot.classList.remove("spicy-playlist-bg");
            }
        }

        if (data.pathname.startsWith("/playlist")) {
            Whentil.When(() => {
                // Make sure both elements exist before proceeding
                return ThisPageRoot.querySelector<HTMLElement>(".under-main-view") &&
                       ThisPageRoot.querySelector<HTMLElement>(".main-entityHeader-container");
            }, async () => {
                const bgColorEntity = ThisPageRoot.querySelector<HTMLElement>(".main-entityHeader-backgroundColor");
                const bgColorOverlayEntity = ThisPageRoot.querySelector<HTMLElement>(".main-entityHeader-backgroundColor.main-entityHeader-overlay");
                const divEntityContainer = ThisPageRoot.querySelector<HTMLElement>(".main-entityHeader-container");
                const underMainView = ThisPageRoot.querySelector<HTMLElement>(".under-main-view");
                const playlistContentActionBar = ThisPageRoot.querySelector<HTMLElement>(".main-actionBarBackground-background");

                // Safety check for required elements
                if (!underMainView || !playlistContentActionBar) {
                    console.warn("PlaylistBGs: Required elements not found");
                    return;
                }

                if (underMainView.querySelector(".main-entityHeader-background")) {
                    return;
                }

            const currentPlaylistId = data.pathname.replace("/playlist/", "");


            //const OriginalImageUrl = `https://storage.spicy-lyrics.spikerko.org/playlist-bgs/${currentPlaylistId}.png`;

            bgColorEntity?.style.setProperty("--BorderRadius", "0");
            bgColorEntity?.classList.add("Skeletoned");
            divEntityContainer?.classList.add("main-entityHeader-withBackgroundImage");

            // const DEV_HOSTNAME = "http://localhost:3000";
            const PROD_HOSTNAME = "https://portal.spicylyrics.org";

            const prefetchUrl = `${PROD_HOSTNAME}/api/playlist-bgs?playlistId=${currentPlaylistId}`;
            let imagePrefetch;

            try {
                imagePrefetch = await fetch(prefetchUrl, {
                    method: "GET",
                });
            } catch (error) {
                console.error("Error fetching playlist bg", error);
                bgColorEntity?.classList.remove("Skeletoned");
                divEntityContainer?.classList.remove("main-entityHeader-withBackgroundImage");
                return;
            }

            if (imagePrefetch.status !== 200) {
                bgColorEntity?.classList.remove("Skeletoned");
                divEntityContainer?.classList.remove("main-entityHeader-withBackgroundImage");
                return;
            }

            const imagePrefetchData = await imagePrefetch.json();

            const ImageUrl = imagePrefetchData.body?.url;

            //const ImageUrl = `https://betterpic.spikerko.org/betterize?url=${OriginalImageUrl}&format=webp&width=1000&quality=80`
            const ImageBlob = await BlobURLMaker(ImageUrl);

            if (ImageBlob === null) {
                return;
            }

            let VibrantColor;

            Whentil.When(() => playlistContentActionBar.style.backgroundColor, async () => {
                const vibrantColor = (await ExtractColorsFromImage(ImageBlob))?.LightVibrant?.getHex()
                playlistContentActionBar.style.backgroundColor = vibrantColor;
                VibrantColor = vibrantColor;
            });


            underMainView.innerHTML = `
                <div>
                    <div data-testid="background-image" class="main-entityHeader-background main-entityHeader-gradient" style="background-image: url('${ImageBlob}');background-position:center center;"></div>
                    <div class="main-entityHeader-background main-entityHeader-overlay" style="--bgColor: ${VibrantColor};"></div>
                </div>
            `;

            bgColorEntity?.remove();
            bgColorOverlayEntity?.remove();

            ThisPageRoot.classList.add("spicy-playlist-bg");
            // console.log("Custom Playlist BGs Loaded!")
        });
    }
    // console.log("Navigated!", data)
});
}

/* async function ExtractColorFromImage(imageUrl: string) {
    const req = await fetch(`https://spicycolor.spikerko.org/extract?url=${imageUrl}`);

    if (req.status !== 200) {
        return null;
    }

    const data = await req.json();
    return data;
} *


async function ExtractColorsFromImage(imageUrl: string) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.crossOrigin = "anonymous";
    img.style.display = "none";

    document.body.appendChild(img);

    const pallete = await Vibrant.from(img).getPalette();

    img.remove();

    return pallete;
} */
