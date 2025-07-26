import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, MapPin, RefreshCw, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LocationOption {
  name: string;
  lat: number;
  lng: number;
  confidence: number;
  description?: string;
}

interface ImageProcessorProps {
  originalFile: File;
  selectedLocation: LocationOption;
  onImageUpdated: (updatedFile: File) => void;
  isProcessing?: boolean;
}

const ImageProcessor: React.FC<ImageProcessorProps> = ({
  originalFile,
  selectedLocation,
  onImageUpdated,
  isProcessing = false
}) => {
  const [hasUpdatedMetadata, setHasUpdatedMetadata] = React.useState(false);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

  const updateImageMetadata = async () => {
    try {
      const formData = new FormData();
      formData.append('image', originalFile);
      formData.append('latitude', selectedLocation.lat.toString());
      formData.append('longitude', selectedLocation.lng.toString());
      formData.append('location_name', selectedLocation.name);

      const response = await fetch('/api/add-location', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Get the updated image as a blob
      const imageBlob = await response.blob();
      
      // Create a new file with the geotagged image
      const fileName = originalFile.name.replace(/\.(jpg|jpeg|png)$/i, '_geotagged.$1');
      const updatedFile = new File([imageBlob], fileName, { type: 'image/jpeg' });
      
      // Create URL for download
      const url = URL.createObjectURL(updatedFile);
      setDownloadUrl(url);
      setHasUpdatedMetadata(true);
      
      onImageUpdated(updatedFile);
      
      toast({
        title: "Metadati aggiornati",
        description: `Coordinate GPS aggiunte: ${selectedLocation.name}`,
      });
      
    } catch (error) {
      console.error('Error updating metadata:', error);
      toast({
        title: "Errore aggiornamento",
        description: "Impossibile aggiornare i metadati dell'immagine",
        variant: "destructive",
      });
    }
  };

  const downloadImage = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = originalFile.name.replace(/\.(jpg|jpeg|png)$/i, '_geotagged.$1');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download avviato",
        description: "L'immagine con i metadati aggiornati è stata scaricata",
      });
    }
  };

  // Coordina GPS formattate
  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
  };

  React.useEffect(() => {
    // Reset quando cambia la posizione selezionata
    setHasUpdatedMetadata(false);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  }, [selectedLocation]);

  React.useEffect(() => {
    // Cleanup URL when component unmounts
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  return (
    <Card className="p-6 bg-gradient-card border-border/50 shadow-design-md">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold">Elaborazione Immagine</h3>
      </div>

      <div className="space-y-4">
        {/* Posizione selezionata */}
        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              Selezionata
            </Badge>
            <span className="font-medium">{selectedLocation.name}</span>
            <Badge variant="outline" className="text-xs">
              {selectedLocation.confidence}%
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">
            {selectedLocation.description}
          </p>
          
          <p className="text-xs font-mono text-muted-foreground">
            {formatCoordinates(selectedLocation.lat, selectedLocation.lng)}
          </p>
        </div>

        {/* Azioni */}
        <div className="space-y-3">
          {!hasUpdatedMetadata ? (
            <Button
              onClick={updateImageMetadata}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Aggiornamento in corso...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Aggiungi GPS ai Metadati
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-success text-sm">
                <Check className="w-4 h-4" />
                <span>Metadati aggiornati con successo</span>
              </div>
              
              <Button
                onClick={downloadImage}
                variant="default"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Scarica Immagine Aggiornata
              </Button>
            </div>
          )}
        </div>

        {/* Informazioni */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
          <p className="font-medium mb-1">Cosa viene aggiunto:</p>
          <ul className="space-y-1 ml-2">
            <li>• Coordinate GPS ({selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)})</li>
            <li>• Timestamp di elaborazione</li>
            <li>• Informazioni sulla fonte della geolocalizzazione</li>
            <li>• Conservazione dei metadati originali</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default ImageProcessor;