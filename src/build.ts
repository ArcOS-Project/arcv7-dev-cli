import axios from "axios";

export async function getArcBuild() {
  try {
    const response = await axios.get("https://v7.izkuipers.nl/build", {
      responseType: "text",
    });

    return `${response.data}`.split("\n")[0].trim();
  } catch {
    return undefined;
  }
}
