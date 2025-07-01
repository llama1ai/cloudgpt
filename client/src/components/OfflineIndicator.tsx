import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showOfflineMessage) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg z-50 max-w-sm mx-auto">
      <div className="flex items-center gap-3">
        {isOnline ? (
          <Wifi className="h-5 w-5 text-green-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-red-500" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">
            {isOnline ? "Połączenie przywrócone" : "Tryb offline"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isOnline 
              ? "Aplikacja jest ponownie online" 
              : "Niektóre funkcje mogą być niedostępne"
            }
          </p>
        </div>
      </div>
    </div>
  );
}