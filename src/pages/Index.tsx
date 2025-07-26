import React, { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import LocationMap from '@/components/LocationMap';
import ExifInfo from '@/components/ExifInfo';
import LocationOptions from '@/components/LocationOptions';
import ImageProcessor from '@/components/ImageProcessor';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProcessingResult {
  exifData?: {
    dateTime?: string;
    camera?: {
      make?: string;
      model?: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    technical?: {
      aperture?: string;
      shutterSpeed?: string;
      iso?: string;
      focalLength?: string;
    };
  };
  probableLocations?: Array<{
    name: string;
    lat: number;
    lng: number;
    confidence: number;
    description?: string;
  }>;
  message?: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const handleImageUpload = async (file: File) => {
    setOriginalFile(file);
    setIsLoading(true);
    setResult(null);
    setSelectedLocation(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Errore server: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

      // Auto-select first location if coordinates not available but locations exist
      if (!data.exifData?.coordinates && data.probableLocations?.length > 0) {
        setSelectedLocation(data.probableLocations[0]);
      }

      toast({
        title: "Elaborazione completata",
        description: "L'analisi dell'immagine è stata completata con successo",
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Mock data for demonstration
      const mockData: ProcessingResult = {
        exifData: {
          dateTime: "2024-07-15 14:30:22",
          camera: {
            make: "Apple",
            model: "iPhone 14 Pro"
          },
          technical: {
            aperture: "f/1.78",
            shutterSpeed: "1/120",
            iso: "64",
            focalLength: "6.9mm"
          }
        },
        probableLocations: [
          {
            name: "Torre Eiffel, Parigi",
            lat: 48.8584,
            lng: 2.2945,
            confidence: 92,
            description: "Iconica torre di ferro a Parigi, Francia"
          },
          {
            name: "Champ de Mars, Parigi",
            lat: 48.8556,
            lng: 2.2986,
            confidence: 78,
            description: "Parco pubblico vicino alla Torre Eiffel"
          },
          {
            name: "Trocadéro, Parigi",
            lat: 48.8619,
            lng: 2.2889,
            confidence: 65,
            description: "Punto panoramico con vista sulla Torre Eiffel"
          }
        ],
        message: "Analisi basata su riconoscimento AI - Demo con dati mock"
      };

      setResult(mockData);
      setSelectedLocation(mockData.probableLocations![0]);

      toast({
        title: "Modalità Demo",
        description: "Utilizzo dati di esempio - il backend non è ancora configurato",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageRemove = () => {
    setResult(null);
    setSelectedLocation(null);
    setOriginalFile(null);
  };

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
  };

  const handleImageUpdated = (updatedFile: File) => {
    // Aggiorna il file originale con quello modificato
    setOriginalFile(updatedFile);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-primary bg-clip-text text-transparent">
            Image Location Analyzer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Carica un'immagine per estrarre i metadati EXIF e scoprire la posizione geografica 
            tramite coordinate GPS o analisi AI avanzata
          </p>
        </div>

        {/* Upload Section */}
        <div className="max-w-2xl mx-auto mb-8 animate-scale-in">
          <ImageUpload 
            onImageUpload={handleImageUpload} 
            onImageRemove={handleImageRemove}
            isLoading={isLoading}
            originalFile={originalFile}
          />
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-slide-up">
            {/* Status Message */}
            {result.message && (
              <Card className="p-4 bg-gradient-card border-border/50 shadow-design-md">
                <div className="flex items-center gap-3">
                  {result.exifData?.coordinates ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-warning" />
                  )}
                  <p className="text-sm font-medium">{result.message}</p>
                </div>
              </Card>
            )}

            <div className="space-y-6">
              {/* EXIF Info */}
              {result.exifData && (
                <ExifInfo exifData={result.exifData} />
              )}

              {/* Image Processor - Above the map */}
              {selectedLocation && originalFile && (
                <ImageProcessor
                  originalFile={originalFile}
                  selectedLocation={selectedLocation}
                  onImageUpdated={handleImageUpdated}
                  isProcessing={isProcessingImage}
                />
              )}

              {/* Map - In the middle */}
              <LocationMap
                latitude={
                  result.exifData?.coordinates?.latitude || selectedLocation?.lat
                }
                longitude={
                  result.exifData?.coordinates?.longitude || selectedLocation?.lng
                }
                locations={result.probableLocations || []}
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
              />

              {/* Location Options - Below the map */}
              {result.probableLocations && result.probableLocations.length > 0 && (
                <LocationOptions
                  locations={result.probableLocations}
                  onLocationSelect={handleLocationSelect}
                  selectedLocation={selectedLocation}
                />
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !isLoading && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Pronto per l'analisi</h3>
            <p className="text-muted-foreground">
              Carica un'immagine per iniziare l'estrazione dei metadati e l'analisi della posizione
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;