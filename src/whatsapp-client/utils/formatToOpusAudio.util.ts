import { randomUUID } from 'crypto';
import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import * as ffmpeg from 'fluent-ffmpeg';

export async function formatToOpusAudio(file: Buffer) {
    return new Promise<Buffer>((resolve, reject) => {
        const tempPath = "../../temp/"
        const savePath = join(__dirname, tempPath, `${randomUUID()}.ogg`);

        const readableStream = new Readable({
            read() {
                this.push(file);
                this.push(null);
            }
        });

        ffmpeg(readableStream)
            .outputOptions('-c:a', 'libopus')
            .outputOptions('-b:a', '64k')
            .outputOptions('-vbr', 'on')
            .outputOptions('-compression_level', '10')
            .outputOptions('-frame_duration', '60')
            .outputOptions('-application', 'voip')
            .output(savePath)
            .on('end', () => {
                const buffer = readFileSync(savePath);

                unlinkSync(savePath);
                resolve(buffer);
            })
            .on('error', (err: any) => {
                reject(err);
            })
            .run();
    });
}