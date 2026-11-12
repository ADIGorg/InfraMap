import { useEffect, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useResource } from "../../shared/useResource";
import { HttpError } from "../../shared/http";
import { analyze, finalize, getAnalysis, getCategories, uploadPhotos, type Analysis, type Photo } from "./reportApi";

export function useReportViewModel() {
  const categories = useResource(getCategories);
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [analysis, setAnalysis] = useState<Analysis>();
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; status: "RECEIVED" }>();
  const lock = useRef(false);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [uncertain, setUncertain] = useState(false);

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Tente novamente."); }
    finally { lock.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (!analysis || !["PENDING", "PROCESSING"].includes(analysis.status)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await getAnalysis(analysis!.id);
        if (cancelled) return;
        if (response.data.status === "COMPLETED") {
          setAnalysis(response.data);
          setDescription(response.data.suggested_description ?? "");
        } else if (["FAILED", "CANCELLED", "CONSUMED"].includes(response.data.status)) {
          setAnalysis(response.data);
        } else timer = setTimeout(poll, 3000);
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Não foi possível consultar a análise.");
      }
    }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [analysis?.id, analysis?.status, pollAttempt]);
  useEffect(() => {
    if (analysis?.status === "COMPLETED") {
      setCategoryId(categories.data?.data.find((item) => item.code === analysis.category_code)?.id ?? "");
    }
  }, [analysis?.id, analysis?.status, categories.data]);

  function removePhoto(index: number) {
    if (busy) return;
    setPhotos((current) => current.filter((_, position) => position !== index));
    setAnalysis(undefined);
  }
  function capture() { return run(async () => {
    if (photos.length >= 3) throw new Error("Você pode enviar até três fotos.");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Permita o acesso à câmera nas configurações do aparelho.");
    const capture = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (capture.canceled) return;
    const photo = capture.assets[0];
    const mimeType = photo.mimeType ?? "image/jpeg";
    if (mimeType !== "image/jpeg" && mimeType !== "image/png") throw new Error("Use uma foto JPEG ou PNG.");
    if (!photo.fileSize || photo.fileSize > 5 * 1024 * 1024) throw new Error("A foto deve ter até 5 MB. Tire outra foto.");
    setPhotos((current) => [...current, { uri: photo.uri, mimeType, sizeBytes: photo.fileSize! }]);
    setAnalysis(undefined);
  }); }
  function startAnalysis() { return run(async () => {
    if (!photos.length) throw new Error("Tire pelo menos uma foto.");
    const id = analysis?.id ?? (await uploadPhotos(photos)).data.id;
    setAnalysis({ id, status: "PENDING", category_code: null, suggested_description: null, confidence: null });
    await analyze(id);
    setAnalysis({ id, status: "PROCESSING", category_code: null, suggested_description: null, confidence: null });
    setStep(2);
  }); }
  function locate() { return run(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) throw new Error("Permita o acesso ao GPS ou selecione o ponto no mapa.");
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
  }); }
  function next() {
    setError("");
    if (step === 1) { if (analysis?.status === "COMPLETED") setStep(2); else void startAnalysis(); return; }
    if (analysis?.status !== "COMPLETED" || !categoryId || !description.trim()) {
      setError("Conclua a análise e revise a categoria e a descrição."); return;
    }
    setStep(step + 1);
  }
  function send() { return run(async () => {
    const category = categories.data?.data.find((item) => item.id === categoryId);
    if (!location || !category || !analysis || analysis.status !== "COMPLETED") throw new Error("Confira os dados e a localização.");
    try {
      const response = await finalize({ photos, analysis, category, description, location });
      setResult(response.data);
    } catch (failure) {
      if (failure instanceof HttpError && failure.status < 500 && failure.status !== 409) throw failure;
      setUncertain(true);
      throw new Error("Não foi possível confirmar o envio. Consulte Minhas ocorrências antes de tentar um novo registro.");
    }
  }); }
  return { step, setStep, photos, capture, removePhoto, analysis, categoryId, setCategoryId,
    description, setDescription, location, setLocation, busy, error, result, categories,
    next, locate, send, startAnalysis, uncertain,
    retryPoll: () => { setError(""); setPollAttempt((value) => value + 1); } };
}
