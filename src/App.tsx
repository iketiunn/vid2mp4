import React, { useState } from "react";
import Ffmpeg from "@ffmpeg/ffmpeg";
import { useDropzone } from "react-dropzone";

const App = () => {
  const [inputFile, setInputFile] = useState(null);
  const [outputFile, setOutputFile] = useState(null);

  const handleConvert = async () => {
    const ffmpeg = Ffmpeg.createFFmpeg({ log: true });
    await ffmpeg.load();

    // Read the input file
    await ffmpeg.FS("writeFile", "input.webm", await fetchFile(inputFile));

    // Run the ffmpeg command to convert the file
    await ffmpeg.run("-i", "input.webm", "output.mp4");

    // Read the output file
    const data = await ffmpeg.FS("readFile", "output.mp4");
    const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));

    setOutputFile(url);
  };

  const fetchFile = async (file) => {
    const response = await fetch(URL.createObjectURL(file));
    return new Uint8Array(await response.arrayBuffer());
  };

  const onDrop = (acceptedFiles) => {
    setInputFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div>
      <h1>WebM to MP4 Converter</h1>
      <div {...getRootProps()} style={{ padding: 20, border: "1px solid black" }}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the file here ...</p>
        ) : (
          <p>Drag and drop a WebM file here, or click to select a file</p>
        )}
      </div>
      {inputFile && (
        <div>
          <p>Selected file: {inputFile.name}</p>
          <button onClick={handleConvert}>Convert</button>
        </div>
      )}
      {outputFile && <video controls src={outputFile} />}
    </div>
  );
};

export default App;

