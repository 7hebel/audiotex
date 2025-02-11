const { GOOGLE_IMG_SCRAP } = require('google-img-scrap');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const appDataPath = require('electron').app.getPath('userData');


// Audiobooks covers.
const COVERS_PATH = path.join(appDataPath, 'covers')
if (!fs.existsSync(COVERS_PATH)) fs.mkdirSync(COVERS_PATH, { recursive: true });

export function getCover(abId: number | bigint): string {
    const coverFilePath = path.join(COVERS_PATH, `${abId}`);
    if (!fs.existsSync(coverFilePath)) return './src/default-cover.png';
    return coverFilePath.replaceAll("\\", "/");
}

export function saveCover(abId: number | bigint, coverArray: any): string {
    const coverFilePath = path.join(COVERS_PATH, `${abId}`);
    fs.writeFileSync(coverFilePath, Buffer.from(coverArray.data));
    return coverFilePath.replaceAll("\\", "/");
}

export function saveCoverFromFile(abId: number | bigint, newCoverPath: string): string {
    const coverFilePath = path.join(COVERS_PATH, `${abId}`);
    if (fs.existsSync(coverFilePath)) fs.unlinkSync(coverFilePath);
    fs.copyFileSync(newCoverPath, coverFilePath);
    return coverFilePath.replaceAll("\\", "/");
}

export function removeCover(abId: number): void {
    const coverFilePath = path.join(COVERS_PATH, `${abId}`);
    if (fs.existsSync(coverFilePath)) fs.unlinkSync(coverFilePath);
}


// Authors' pictures.
const AUTHORS_PICS_PATH = path.join(appDataPath, 'authors');
if (!fs.existsSync(AUTHORS_PICS_PATH)) fs.mkdirSync(AUTHORS_PICS_PATH, { recursive: true });


async function __fetchAuthorImageURL(name: string, randomize: boolean = false): Promise<string> {
    name = name.replace("%20", "");
    const searchName = name.replace("_", " ");
    let url;

    if (!randomize) {
        const result = await GOOGLE_IMG_SCRAP({
            search: searchName,
            limit: 1
        });
        url = result.result[0]?.url;

    } else {
        const allResults = await GOOGLE_IMG_SCRAP({
            search: searchName,
            limit: 20
        });
        url = allResults.result[Math.floor(Math.random() * allResults.result.length)]?.url;
    }

    const defaultAvatar = "./src/default-author.png";

    if (url) {
        try {
            name = name.replace(" ", "_");
            const authorPicPath = path.join(AUTHORS_PICS_PATH, name);
            const response = await axios({
                url: url,
                method: 'GET',
                responseType: 'stream'
            });

            const timestamp = new Date().getTime();
            const writer = fs.createWriteStream(authorPicPath);

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`Downloaded author's image: ${name}`);
            return authorPicPath.replaceAll('\\', "/") + `?v=${timestamp}`;
        } catch (error: any) {
            console.error(`Error downloading author image: ${error.message}`);
            return defaultAvatar;
        }
    }

    return defaultAvatar;
}

export async function getAuthorImage(name: string): Promise<string> {
    if (name == "Unknown") return `./src/default-author.png`;
    
    name = name.replace(" ", "_");
    const authorPicPath = path.join(AUTHORS_PICS_PATH, name);
    if (fs.existsSync(authorPicPath)) return authorPicPath.replaceAll('\\', "/");
    
    const timestamp = new Date().getTime();
    const imagePath = await __fetchAuthorImageURL(name);
    return imagePath.replaceAll('\\', "/") + `?v=${timestamp}`;
}


export async function updateAuthorCover(name: string): Promise<string> {
    if (name == "Unknown") return `./src/default-author.png`;
    const imagePath = await __fetchAuthorImageURL(name, true);
    return imagePath.replaceAll('\\', "/");
}
