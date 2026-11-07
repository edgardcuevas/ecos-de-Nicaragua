export default function AudioPlayer({ audio }) {
  return (
    <div className="audio">
      <strong>{audio.titulo}</strong>
      <audio controls preload="none" src={audio.url}>
        Tu navegador no puede reproducir audio.
      </audio>
    </div>
  )
}
