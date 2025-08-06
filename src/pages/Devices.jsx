// src/components/Devices.jsx
import React, { useState, useEffect } from 'react';

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
};

// Predefined brand list
const BRAND_LIST = ['All', 'Xiaomi', 'Poco', 'Redmi', 'OnePlus', 'Nothing', 'Motorola', 'Other'];

// Device card component
const DeviceCard = ({ device, isExpanded, onExpand }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Get status badge color based on ROM type
  const getStatusColor = (romtype) => {
    switch (romtype) {
      case 'Official': return 'bg-green-500';
      case 'Community': return 'bg-blue-500';
      case 'Beta': return 'bg-yellow-500';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div 
      className={`bg-gray-800 rounded-xl overflow-hidden transition-all duration-300 ${
        isHovered ? 'scale-[1.02] shadow-2xl' : 'shadow-lg'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="p-5 cursor-pointer"
        onClick={onExpand}
      >
        <div className="flex items-start space-x-4">
          <div className="bg-gray-700 rounded-lg flex items-center justify-center w-16 h-16">
            <div className="bg-gray-600 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-400">
                {device.name.charAt(0)}
              </span>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{device.name}</h2>
                <p className="text-gray-400 text-sm">{device.codename}</p>
              </div>
              {device.builds && device.builds.length > 0 && (
                <span className={`${getStatusColor(device.builds[0].romtype)} text-xs px-2 py-1 rounded-full font-semibold`}>
                  {device.builds[0].romtype}
                </span>
              )}
            </div>
            
            <div className="mt-2 flex items-center">
              <span className="text-gray-400 mr-2">Maintainer:</span>
              <a 
                href={`https://github.com/${device.maintainer}`} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                @{device.maintainer}
              </a>
            </div>
            
            <button 
              className="mt-4 w-full py-2 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white rounded-lg transition-all duration-300 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                // In a real app, you would navigate to the device detail page
                alert(`Navigate to device page: ${device.codename}`);
              }}
            >
              View Builds
            </button>
          </div>
        </div>
      </div>
      
      {/* Accordion content */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="border-t border-gray-700 p-5 bg-gray-750">
          <h3 className="font-bold text-lg mb-3 text-teal-400">Available Builds</h3>
          
          {device.builds ? (
            <ul className="space-y-2 mb-6">
              {device.builds.map((build, index) => (
                <li key={index} className="flex justify-between items-center bg-gray-900 p-3 rounded-lg">
                  <div>
                    <div className="font-medium">{build.version}</div>
                    <div className="text-sm text-gray-400">
                      {new Date(build.datetime * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatFileSize(build.size)}</div>
                    <a 
                      href={build.url} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-400 hover:underline text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Download
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4 text-gray-400">Loading builds...</div>
          )}
          
          <h3 className="font-bold text-lg mb-3 text-teal-400">Changelog</h3>
          {device.changelog ? (
            <pre className="whitespace-pre-wrap bg-gray-900 p-4 rounded-lg max-h-60 overflow-y-auto text-sm font-sans">
              {device.changelog}
            </pre>
          ) : (
            <div className="text-center py-4 text-gray-400">Loading changelog...</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main DevicesPage component
const DevicesPage = () => {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [expandedDevice, setExpandedDevice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Extract brand from device name
  const getBrandFromName = (deviceName) => {
    const brand = BRAND_LIST.find(brand => 
      brand !== 'All' && brand !== 'Other' && 
      deviceName.toLowerCase().includes(brand.toLowerCase())
    );
    return brand || 'Other';
  };

  // Parse devices.txt content
  const parseDevicesData = (text) => {
    const blocks = text.trim().split('\n\n');
    return blocks.map(block => {
      const lines = block.split('\n').map(line => line.trim());
      const nameMatch = lines[0].match(/(.+?)\s*\((.+?)\)/);
      return {
        name: nameMatch ? nameMatch[1] : lines[0],
        codename: nameMatch ? nameMatch[2] : 'unknown',
        maintainer: lines[1],
        jsonUrl: lines[2],
        changelogUrl: lines[3],
        brand: nameMatch ? getBrandFromName(nameMatch[1]) : 'Other'
      };
    });
  };

  // Fetch all device data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch devices.txt
        const response = await fetch('/devices.txt');
        const text = await response.text();
        const devicesData = parseDevicesData(text);
        
        // Fetch builds and changelogs for each device
        const devicesWithData = await Promise.all(
          devicesData.map(async (device) => {
            try {
              const [buildsRes, changelogRes] = await Promise.all([
                fetch(device.jsonUrl),
                fetch(device.changelogUrl)
              ]);
              
              return {
                ...device,
                builds: buildsRes.ok ? (await buildsRes.json()).response : null,
                changelog: changelogRes.ok ? await changelogRes.text() : null
              };
            } catch (error) {
              console.error(`Error fetching data for ${device.codename}:`, error);
              return { ...device, builds: null, changelog: null };
            }
          })
        );
        
        setDevices(devicesWithData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading devices:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter devices based on search term and brand
  useEffect(() => {
    const filtered = devices.filter(device => {
      const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          device.codename.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBrand = selectedBrand === 'All' || device.brand === selectedBrand;
      return matchesSearch && matchesBrand;
    });
    setFilteredDevices(filtered);
  }, [devices, searchTerm, selectedBrand]);

  // Get unique brands from devices
  const getAvailableBrands = () => {
    const brands = [...new Set(devices.map(device => device.brand))];
    return ['All', ...BRAND_LIST.filter(brand => 
      brand !== 'All' && brands.includes(brand)
    )];
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center animate-fadeIn">
          Supported Devices
        </h1>
        
        {/* Search input */}
        <div className="mb-8 animate-fadeInUp">
          <input
            type="text"
            placeholder="Search devices..."
            className="w-full p-4 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Brand filter pills */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center animate-fadeInUp">
          {getAvailableBrands().map(brand => (
            <button
              key={brand}
              className={`px-4 py-2 rounded-full transition-all duration-300 ${
                selectedBrand === brand
                  ? 'bg-gradient-to-r from-teal-400 to-green-400 text-gray-900 font-bold'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => setSelectedBrand(brand)}
            >
              {brand}
            </button>
          ))}
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            <p className="mt-4 text-gray-400">Loading devices...</p>
          </div>
        )}
        
        {/* Devices grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeInUp">
            {filteredDevices.map(device => (
              <DeviceCard
                key={device.codename}
                device={device}
                isExpanded={expandedDevice === device.codename}
                onExpand={() => setExpandedDevice(
                  expandedDevice === device.codename ? null : device.codename
                )}
              />
            ))}
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && filteredDevices.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">😢</div>
            <h3 className="text-xl font-semibold">No devices found</h3>
            <p className="text-gray-400 mt-2">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevicesPage;