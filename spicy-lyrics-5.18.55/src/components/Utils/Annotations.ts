/*
// Not used

import { GetExpireStore } from "@spikerko/tools/Cache";
import { SendJob } from "../../utils/API/SendJob";
import Platform from "../Global/Platform";
import Global from "../Global/Global";
import { SpotifyPlayer } from "../Global/SpotifyPlayer";

type SongAnnotation = {
    annotation: string;
}
//imageVisual: string;
const AnnotationStore = GetExpireStore<SongAnnotation>(
    "SpicyLyrics_SongAnnotations",
    1,
    {
        Unit: "Days",
        Duration: 7
    }
)

export const GetSongAnnotation = async (songId: string): Promise<SongAnnotation | null> => {
    // console.log("GetSongAnnotation called with songId:", songId);
    if (!songId) {
        // console.log("songId is null or empty, returning null.");
        return null;
    }

    const cachedAnnotation = await AnnotationStore.GetItem(songId);
    // console.log("Cached annotation:", cachedAnnotation);
    if (cachedAnnotation) {
        // console.log("Returning cached annotation.");
        return { annotation: cachedAnnotation.annotation };
    }

    try {
        // console.log("No cached annotation found, fetching from API.");
        //const SongArtists = SpotifyPlayer.GetArtists();

        // console.log("Sending job to API.");
        const jobResponse = await SendJob([
            {
                handler: "SONG_ANNOTATIONS",
                args: {
                    id: songId
                }
            },
            /* {
                handler: "ARTIST_VISUALS_ID",
                args: {
                    artistUri: (SongArtists && SongArtists.length > 0 ? SongArtists[0].uri : null),
                    trackUri: SpotifyPlayer.GetUri() ?? ""
                }
            } *
        ])
        // console.log("Job response received:", jobResponse);

        const job = jobResponse.get("SONG_ANNOTATIONS");
        // console.log("Extracted job for SONG_ANNOTATIONS:", job);
        if (!job) {
            // console.log("SONG_ANNOTATIONS job not found in response, returning null.");
            return null;
        }
        
        if (job.status !== 200) {
            // console.log("Job status is not 200, returning null. Status:", job.status);
            return null;
        }

        if (!job.responseData) {
            // console.log("Job responseData is null, returning null.");
            return null;
        }

        if (job.type !== "json") {
            // console.log("Job type is not json, returning null. Type:", job.type);
            return null;
        }

        if (job.responseData.error) {
            // console.log("Job responseData contains an error, returning null. Error:", job.responseData.error);
            return null;
        }

        /* const visualsJob = jobResponse.get("ARTIST_VISUALS_ID");
        if (!visualsJob) {
            return null;
        }
        
        if (visualsJob.status !== 200) {
            return null;
        }

        if (!visualsJob.responseData) {
            return null;
        }

        if (visualsJob.type !== "json") {
            return null;
        }

        if (visualsJob.responseData.error) {
            return null;
        } *

        const annotation = job.responseData?.annotation;
        // console.log("Extracted annotation:", annotation);
        if (!annotation || typeof annotation !== "string") {
            // console.log("Annotation is null or not a string, returning null.");
            return null;
        }

        /* const headerImageVisual = "";//visualsJob.responseData?.Visuals?.headerImage?.sources[0]?.url;
        // console.log("Extracted headerImageVisual:", headerImageVisual); // It will always be an empty string due to the line above
        if (!headerImageVisual || typeof headerImageVisual !== "string") { // This condition will always be true because headerImageVisual is ""
            // console.log("headerImageVisual is null or not a string, returning null. This will always happen with current code.");
            return null;
        } *

        // console.log("Setting item in AnnotationStore with songId:", songId, "and annotation:", annotation);
        await AnnotationStore.SetItem(songId, {
            annotation: annotation
        });

        // console.log("Returning annotation:", { annotation });
        return { annotation } //{ annotation, imageVisual: headerImageVisual };
    } catch (error) {
        console.error("Error getting song annotations", error);
        return null;
    }
}

Global.SetScope("Annotations", {
    GetSongAnnotation
})


export const UpdateSongMoreInfo = async () => {
    const songId = SpotifyPlayer.GetId();
    if (!songId) {
        return;
    }

    const SongMoreInfo = document.querySelector<HTMLDivElement>("#SpicyLyricsPage .SongMoreInfo");
    if (!SongMoreInfo) {
        return;
    }

    const SongArtwork = SpotifyPlayer.GetCover("standard") ?? "";

    const SongName = SpotifyPlayer.GetName();
    const Artists = SpotifyPlayer.GetArtists();
    const JoinedArtists = Artists?.map((artist) => artist.name).join(", ");

    const SongTextMetadataElement = SongMoreInfo.querySelector<HTMLDivElement>(".Content .SongMetadata .SongMetadataTextContent")
    if (!SongTextMetadataElement) {
        return;
    }
    const SongNameElement = SongTextMetadataElement.querySelector<HTMLSpanElement>(".SongName span");
    const ArtistsNamesElement = SongTextMetadataElement.querySelector<HTMLSpanElement>(".ArtistsNames span");

    const ArtworkElement = SongMoreInfo.querySelector<HTMLImageElement>(".Content .SongMetadata .SongArtwork");

    const AnnotationElement = SongMoreInfo.querySelector<HTMLSpanElement>(".Content .SongAnnotation .Annotation span");

    if (!SongNameElement || !ArtistsNamesElement || !ArtworkElement || !AnnotationElement) {
        return;
    }

    SongNameElement.textContent = SongName ?? "";
    ArtistsNamesElement.textContent = JoinedArtists ?? "";

    ArtworkElement.src = SongArtwork ?? "";

    const Annotation = await GetSongAnnotation(songId);
    // console.log(Annotation)
    if (!Annotation) {
        AnnotationElement.innerHTML = "No Annotation Found";
        return;
    }

    AnnotationElement.innerHTML = Annotation?.annotation ?? "No Annotation Found";
} */
