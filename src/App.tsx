import React, { useEffect, useRef, useState } from "react";
import { FFmpeg } from '@diffusion-studio/ffmpeg-js';
import { useDropzone } from "react-dropzone";

const App: React.FC = () => {
  const ffmpegRef = useRef<FFmpeg>();
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [inputFileSize, setInputFileSize] = useState<number>(0);
  const [outputFileSize, setOutputFileSize] = useState<number>(0);
  const [conversionTime, setConversionTime] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(true);

  useEffect(() => {
    ffmpegRef.current = new FFmpeg({
      log: false,
      config: "gpl-extended",
    });
    ffmpegRef.current.whenReady(() =>{
      setIsDownloading(false);
    });
  }, []);

  const handleConvert = async () => {
    setIsDownloading(true);
    setIsDownloading(false);
    const ffmpeg = ffmpegRef.current;
    
    if (!ffmpeg) {
      return;
    }

    if (!inputFile) {
      return;
    }

    const startTime = performance.now();
    const inputData = await fetch(URL.createObjectURL(inputFile)).then(res => res.blob());
    setInputFileSize(inputData.size);
    const meta = await ffmpeg.meta(inputData);
    const duration = meta.duration;
    await ffmpeg.writeFile(inputFile.name, inputData);
    ffmpeg.onMessage(msg => {
      const [type, data] = msg.split("=");
      if (type === "out_time_ms" && duration) {
        setProgress(Math.round((parseInt(data) / (duration * 1e6)) * 100));
      }
      if (type === "total_size") {
        setOutputFileSize(parseInt(data));
      }
    });
    const outputFileName = "output.mp4";
    await ffmpeg
      .exec([
        "-i", inputFile.name,
        "-c:v", "libx264",
        "-preset", "superfast",
        "-movflags", "faststart",
        "-crf", "30",
        "-progress", "-",
        "-v", "",
        "-y",
        outputFileName
      ])
    const data = ffmpeg.readFile(outputFileName);
    const url = URL.createObjectURL(new Blob([data], { type: "video/mp4" }));
    const endTime = performance.now();
    setConversionTime(Math.round(endTime - startTime));
    setOutputFile(url);
    setProgress(null);
  };

  const onDrop = (acceptedFiles: File[]) => {
    setInputFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "video/*": [] }});

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-12 md:px-0">
      <div className="w-full md:w-2/3 bg-white rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-4">Any video to MP4</h1>
        <div
          {...getRootProps()}
          className="border-2 border-dashed rounded-md p-6 mt-4"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the file here ...</p>
          ) : (
            <p>Drag and drop a video file here, or click to select a file</p>
          )}
        </div>
        {inputFile && (
          <div className="mt-4">
            <p>Selected file: {inputFile.name}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-x-2">
          <button
            className="btn btn-accent"
            disabled={!inputFile || isDownloading || progress !== null}
            onClick={handleConvert}
          >
            Convert
          </button>
        </div>
        {isDownloading && (
          <p className="mt-2"> Downloading the converter... </p>
        )}
        {progress !== null && (
          <div className="mt-4">
            <p> Converting... </p>
            <progress
              className="progress progress-info w-full"
              max={100}
              value={progress}
            />
            <p className="mt-2">{progress}%</p>
          </div>
        )}
        <div className="mt-4">
          {outputFile && <>
            <video className="w-full" controls src={outputFile} />
            <p className="mt-2">
              Conversion time: {Number(conversionTime) / 1000} s
            </p>
          </>}
          {inputFileSize > 0 && <p>Input file size: {(inputFileSize / 1024 / 1024).toFixed(2)} MB</p>}
          {outputFileSize > 0 && <p>Output file size: {(outputFileSize / 1024 / 1024).toFixed(2)} MB</p>}
        </div>

        <footer className="footer items-center justify-between pt-20 text-gray-400">
          <div className="items-end grid-flow-col ">
            <p>Copyright © 2023 - All right reserved </p>
          </div>
          <div className="grid-flow-col">
          {/* add home link to about page */}
            <a href="https://blog.sideeffect.dev/about" target="_blank">
              <svg 
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                <path d="M2 12h20"/>
              </svg>
            </a>
            <a href="https://github.com/iketiunn/webm-to-mp4" target="_blank">
              <svg
                width="20"
                height="20"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                className="inline-block h-5 w-5 fill-current md:h-6 md:w-6"
              >
                <path d="M256,32C132.3,32,32,134.9,32,261.7c0,101.5,64.2,187.5,153.2,217.9a17.56,17.56,0,0,0,3.8.4c8.3,0,11.5-6.1,11.5-11.4,0-5.5-.2-19.9-.3-39.1a102.4,102.4,0,0,1-22.6,2.7c-43.1,0-52.9-33.5-52.9-33.5-10.2-26.5-24.9-33.6-24.9-33.6-19.5-13.7-.1-14.1,1.4-14.1h.1c22.5,2,34.3,23.8,34.3,23.8,11.2,19.6,26.2,25.1,39.6,25.1a63,63,0,0,0,25.6-6c2-14.8,7.8-24.9,14.2-30.7-49.7-5.8-102-25.5-102-113.5,0-25.1,8.7-45.6,23-61.6-2.3-5.8-10-29.2,2.2-60.8a18.64,18.64,0,0,1,5-.5c8.1,0,26.4,3.1,56.6,24.1a208.21,208.21,0,0,1,112.2,0c30.2-21,48.5-24.1,56.6-24.1a18.64,18.64,0,0,1,5,.5c12.2,31.6,4.5,55,2.2,60.8,14.3,16.1,23,36.6,23,61.6,0,88.2-52.4,107.6-102.3,113.3,8,7.1,15.2,21.1,15.2,42.5,0,30.7-.3,55.5-.3,63,0,5.4,3.1,11.5,11.4,11.5a19.35,19.35,0,0,0,4-.4C415.9,449.2,480,363.1,480,261.7,480,134.9,379.7,32,256,32Z"></path>
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
