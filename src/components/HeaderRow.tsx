
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeySquare } from "lucide-react";

interface HeaderRowProps {
  sourceHeader: string;
  suggestions: Array<{ header: string; similarity: number }>;
  targetHeaders: string[];
  selectedMatch: string | null;
  onMatchSelected: (match: string | null) => void;
  isUniqueKey?: boolean; // New prop to indicate if this is a unique key
  potentialUniqueKeyMatch?: string; // Potential unique key match
}

const HeaderRow = ({
  sourceHeader,
  suggestions,
  targetHeaders,
  selectedMatch,
  onMatchSelected,
  isUniqueKey = false,
  potentialUniqueKeyMatch
}: HeaderRowProps) => {
  // State to show suggestion badges
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Update selected match when top suggestion changes on threshold update or unique key is identified
  useEffect(() => {
    if ((suggestions.length > 0 && !selectedMatch) || 
        (isUniqueKey && potentialUniqueKeyMatch && !selectedMatch)) {
      onMatchSelected(potentialUniqueKeyMatch || suggestions[0]?.header || null);
    }
  }, [suggestions, selectedMatch, onMatchSelected, isUniqueKey, potentialUniqueKeyMatch]);

  // Helper for determining badge color based on similarity score
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 80) return 'bg-green-100 text-green-800';
    if (similarity >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-orange-100 text-orange-800';
  };

  return (
    <div className={`border-b last:border-b-0 py-3 px-2 hover:bg-slate-50 transition-colors ${isUniqueKey ? 'bg-blue-50' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
        {/* Source header */}
        <div className="md:w-1/4 font-medium text-csv-blue-dark flex items-center">
          {isUniqueKey && (
            <KeySquare className="h-4 w-4 mr-1 text-blue-600" />
          )}
          {sourceHeader}
          {isUniqueKey && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              Unique Key
            </span>
          )}
        </div>
        
        {/* Suggestions */}
        <div className="md:w-1/3 flex flex-wrap gap-2">
          {showSuggestions && suggestions.map((suggestion) => (
            <span
              key={suggestion.header}
              className={`text-xs px-2 py-1 rounded-full ${getSimilarityColor(suggestion.similarity)} cursor-pointer ${suggestion.header === potentialUniqueKeyMatch ? 'ring-2 ring-blue-400' : ''}`}
              onClick={() => onMatchSelected(suggestion.header)}
            >
              {suggestion.header} ({suggestion.similarity}%)
              {suggestion.header === potentialUniqueKeyMatch && ' ★'}
            </span>
          ))}
          {suggestions.length === 0 && (
            <span className="text-xs text-muted-foreground">No matches found</span>
          )}
        </div>
        
        {/* Select dropdown */}
        <div className="md:w-1/3">
          <Select
            value={selectedMatch || "not_mapped"}
            onValueChange={(value) => onMatchSelected(value === "not_mapped" ? null : value)}
          >
            <SelectTrigger className={isUniqueKey ? "border-blue-300" : ""}>
              <SelectValue placeholder="Select target column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_mapped">--Not Mapped--</SelectItem>
              {targetHeaders.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                  {header === potentialUniqueKeyMatch && " ★"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default HeaderRow;

