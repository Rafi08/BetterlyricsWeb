// the chromium browser instance seems to not support the hls codec i need to use, so i guess this probably wont be used, or atleast until i find a better solution
/* import Platform from "../../components/Global/Platform";
import { SendJob } from "./SendJob"

export type EditorialArtwork = {
    previewFrame: {
        width: number;
        url: string;
        textGradient: string[];
        gradient: {
            y2: number;
            color: string;
        };
        height: number;
        textColor3: string;
        textColor2: string;
        textColor4: string;
        textColor1: string;
        bgColor: string;
        hasP3: boolean;
    };
    video: string;
};

export type SquareEditorialArtwork = EditorialArtwork;
export type TallEditorialArtwork = EditorialArtwork;

export type EditorialArtworkResult = {
    Content: {
        square: SquareEditorialArtwork;
        tall: TallEditorialArtwork;
    }
}

export const GetEditorialArtwork = async (trackId: string): Promise<EditorialArtworkResult | null> => {
    try {
        const Token = await Platform.GetSpotifyAccessToken();

        const response = await SendJob([
            {
                handler: "EDITORIAL_ARTWORK",
                args: {
                    id: trackId,
                    auth: "SpicyLyrics-WebAuth"
                }
            }
        ], {
            "SpicyLyrics-WebAuth": `Bearer ${Token}`
        })

        const result = response.get("EDITORIAL_ARTWORK");
        if (!result || !result.responseData) throw new Error("No result EDITORIAL_ARTWORK job");
        if (result.status !== 200) throw new Error("Failed to get editorial artwork");

        if (result.responseData.Content.error) throw new Error(`Editorial Artwork Fail: ${result.responseData.Content.error}`)
        
        return result.responseData;
    } catch (error) {
        console.error("Failed to get editorial artwork", error);
        return null;
    }
} */
