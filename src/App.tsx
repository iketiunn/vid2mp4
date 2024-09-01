import React, { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { useDropzone } from "react-dropzone";
import { get, set } from "idb-keyval";

const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"; // If you are a vite user, use esm in baseURL instead of umd
const WASM = "ffmpeg-core.wasm";
const JS = "ffmpeg-core.js";
//const WORKER = "ffmpeg-core.worker.js";

async function getFfmpegWasmPath() {
  //let [wasm, js] = await Promise.all([get(WASM), get(JS)]);
  let [wasm, js]: any[] = [undefined, undefined, undefined];
  if (!wasm || !js) {
    console.log("fetching wasm files...");
    const [wasmResponse, jsResponse] = await Promise.all([
      fetch(`${baseURL}/${WASM}`).then((res) => res.arrayBuffer()),
      fetch(`${baseURL}/${JS}`).then((res) => res.text()), // TODO: arrayBuffer?
      //fetch(`${baseURL}/${WORKER}`).then((res) => res.text()),
    ]);
    await Promise.all([
      set(WASM, wasmResponse),
      set(JS, jsResponse),
      //set(WORKER, workerResponse),
    ]);
    wasm = wasmResponse;
    js = jsResponse;
    //worker = workerResponse;
    console.log("wasm files fetched and stored in indexedDB");
  }
  console.log("wasm files loaded");

  return [
    URL.createObjectURL(new Blob([wasm], { type: "application/wasm" })),
    URL.createObjectURL(new Blob([js], { type: "application/javascript" })),
    //URL.createObjectURL(new Blob([worker], { type: "application/javascript" })),
  ];
}

const App: React.FC = () => {
  const ffmpegRef = useRef(new FFmpeg());
  const [inputUrl, setInputUrl] = useState<string>("");
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [conversionTime, setConversionTime] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  ffmpegRef.current.on("log", ({ message, type }) => {
    console.log(type, message);
  });

  const handleConvert = async () => {
    setIsDownloading(true);
    const [wasmURL, coreURL] = await getFfmpegWasmPath();
    setIsDownloading(false);
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.load({
      coreURL,
      wasmURL,
    });

    let inputData: Uint8Array | null = null;
    if (inputFile) {
      inputData = await fetchFile(inputFile);
    } else if (inputUrl) {
      inputData = await fetchUrl(inputUrl);
    }

    if (!inputData) {
      return;
    }

    // Read the input file
    await ffmpeg.writeFile("input.webm", inputData);

    // Run the ffmpeg command to convert the file
    const startTime = performance.now();
    ffmpeg.on("progress", ({ progress }) => {
      console.log(progress);
      setProgress(Math.round(progress * 100));
    });
    await ffmpeg.exec([
      "-i",
      "input.webm", // Input file
      "-preset",
      "ultrafast", // Use the fastest preset
      "-c:v",
      "libx264", // Specify the video codec
      "-crf",
      "28", // Set a higher CRF for faster encoding with reduced quality
      "-c:a",
      "copy", // Copy the audio stream without re-encoding
      "output.mp4", // Output file
    ]);

    const endTime = performance.now();
    setConversionTime(Math.round(endTime - startTime));

    // Read the output file
    const data = await ffmpeg.readFile("output.mp4");
    const url = URL.createObjectURL(new Blob([data], { type: "video/mp4" }));

    setOutputFile(url);
    setProgress(null);
  };

  const fetchFile = async (file: File) => {
    const response = await fetch(URL.createObjectURL(file));
    return new Uint8Array(await response.arrayBuffer());
  };

  const fetchUrl = async (url: string) => {
    const response = await fetch(url);
    return new Uint8Array(await response.arrayBuffer());
  };

  const onDrop = (acceptedFiles: File[]) => {
    setInputFile(acceptedFiles[0]);
    setInputUrl("");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="w-full md:w-1/2 bg-white rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-4">WebM to MP4 Converter</h1>
        <div
          {...getRootProps()}
          className="border-2 border-dashed rounded-md p-6 mt-4"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the file here ...</p>
          ) : (
            <p>Drag and drop a WebM file here, or click to select a file</p>
          )}
        </div>
        <div className="mt-4">
          <input
            type="text"
            placeholder="Enter video URL"
            value={inputUrl}
            onChange={(e) => {
              setInputUrl(e.target.value);
              setInputFile(null); // Clear file input if a URL is entered
            }}
            className="input input-bordered w-full"
          />
        </div>
        {inputFile && (
          <div className="mt-4">
            <p>Selected file: {inputFile.name}</p>
          </div>
        )}
        <div className="mt-4">
          <button
            className="btn btn-accent"
            disabled={!inputFile && !inputUrl}
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
        {outputFile && (
          <div className="mt-4">
            <video className="w-full" controls src={outputFile} />
            <p className="mt-2">
              Conversion time: {Number(conversionTime) / 1000} s
            </p>
          </div>
        )}

        <footer className="footer items-center justify-between py-20 text-neutral-content">
          <div className="items-end grid-flow-col">
            <p>Copyright © 2023 - All right reserved</p>
          </div>
          <div className="grid-flow-col">
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
