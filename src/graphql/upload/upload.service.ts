import { Injectable } from '@nestjs/common';

import { FileUpload } from 'graphql-upload';

import { execFile } from 'child_process';
import fs from 'fs';
import hasha from 'hasha';
import path from 'path';
import { Readable } from 'stream';
import { slugify } from 'transliteration';

import { IExecCommand } from './interface/exec_command.interface';
import { IFileInFs } from './interface/file_in_fs.interface';

const uploadDir = __dirname + '/../../../uploads';

@Injectable()
export class UploadService {
  private getFileOrDirSizeInBytes(filePath: string): number {
    let size = 0;

    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      size += stats.size;
    } else if (stats.isDirectory()) {
      // tslint:disable-next-line: no-map-without-usage
      fs.readdirSync(filePath).map((child) => {
        size += this.getFileOrDirSizeInBytes(`${filePath}/${child}`);
      });
    }

    return size;
  }

  private deleteDirOrFile(filePath: string): void {
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      fs.unlinkSync(filePath);
    } else if (stats.isDirectory()) {
      // tslint:disable-next-line: no-map-without-usage
      fs.readdirSync(filePath).map((child) => {
        this.deleteDirOrFile(`${filePath}/${child}`);
      });

      fs.rmdirSync(filePath);
    }

    return;
  }

  // tslint:disable-next-line: no-any
  private async saveFile(filePath: string, file: Buffer | any): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.mkdir(path.dirname(filePath), { recursive: true }, (errorMkdir: Error) => {
        if (errorMkdir) {
          reject(errorMkdir);
        }
        fs.writeFile(filePath, file, (errorWrite: Error) => {
          if (errorWrite) {
            reject(errorWrite);
          }
          resolve();
        });
      });
    });
  }

  public async execCommand(command: string, args: string[]): Promise<IExecCommand> {
    return new Promise((resolve, reject) => {
      execFile(command, args, { encoding: 'buffer' }, (err: Error, stdout: Buffer, stderr: Buffer) => {
        if (err) {
          reject(err);
        }
        return resolve({ stdout, stderr });
      });
    });
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const buffer = [];

    return new Promise((resolve, reject) =>
      stream
        .on('error', (error) => reject(error))
        .on('data', (data) => buffer.push(data))
        .on('end', () => resolve(Buffer.concat(buffer)))
    );
  }

  // tslint:disable-next-line: no-flag-args
  public async storeFileByFs(file: FileUpload): Promise<IFileInFs> {
    const fileStream = file.createReadStream();

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const buffer = await this.streamToBuffer(fileStream);
    const hashSum = hasha(buffer, { algorithm: 'sha256' });

    const fileName = slugify(file.filename);
    const fullPath = path.resolve(uploadDir, hashSum, fileName);
    const fileDir = path.resolve(uploadDir, hashSum);

    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir);

      await this.saveFile(fullPath, buffer);
    }

    const fileSize = this.getFileOrDirSizeInBytes(path.dirname(fullPath));

    return {
      originName: file.filename,
      fileName,
      fullPath,
      filePath: `/uploads/${hashSum}/${fileName}`,
      fileSize,
      fileMimetype: file.mimetype,
      hashSum,
    };
  }

  public async removeDirByFs(hashSum: string): Promise<boolean> {
    const dirPath = path.resolve(uploadDir, hashSum);

    if (fs.existsSync(dirPath)) {
      this.deleteDirOrFile(dirPath);
    }

    return true;
  }
}
