import axios from "axios";

export async function getArcBuild() {
  try {
    const response = await axios.get("https://os.arcweb.nl/build", {
      responseType: "text",
    });

    return `${response.data}`.split("\n")[0].trim();
  } catch {
    return undefined;
  }
}
