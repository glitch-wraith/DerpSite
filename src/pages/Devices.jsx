// src/pages/devices.jsx
import React, { useState, useEffect } from 'react';

const DevicesPage = () => {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState('All');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/devices.txt');
        if (!response.ok) throw new Error('Failed to fetch devices');
        
        const text = await response.text();
        const deviceBlocks = text.trim().split('\n\n');
        
        const parsedDevices = await Promise.all(
          deviceBlocks.map(async (block) => {
            const lines = block.split('\n');
            if (lines.length < 4) return null;
            
            // Extract device name and codename
            const nameMatch = lines[0].match(/^(.*?)\s*\((.*?)\)$/);
            if (!nameMatch) return null;
            
            const fullName = nameMatch[1].trim();
            const manufacturer = fullName.split(' ')[0];
            const codename = nameMatch[2].trim();
            const maintainer = lines[1].trim();
            const jsonUrl = lines[2].trim();
            const changelogUrl = lines[3].trim();
            
            // Fetch build info
            try {
              const buildResponse = await fetch(jsonUrl);
              if (!buildResponse.ok) throw new Error(`Failed to fetch build info for ${codename}`);
              
              const buildData = await buildResponse.json();
              const latestBuild = buildData.response[0];
              
              return {
                id: codename,
                fullName,
                manufacturer,
                codename,
                maintainer,
                jsonUrl,
                changelogUrl,
                buildInfo: {
                  datetime: latestBuild.datetime,
                  filename: latestBuild.filename,
                  id: latestBuild.id,
                  romtype: latestBuild.romtype,
                  size: latestBuild.size,
                  url: latestBuild.url,
                  version: latestBuild.version
                },
                imageUrl: `/img/devices/${codename}.png`
              };
            } catch (buildError) {
              console.error(`Error fetching build for ${codename}:`, buildError);
              return null;
            }
          })
        );
        
        const validDevices = parsedDevices.filter(device => device !== null);
        setDevices(validDevices);
        
        // Extract unique manufacturers
        const uniqueManufacturers = [...new Set(validDevices.map(device => device.manufacturer))];
        setManufacturers(['All', ...uniqueManufacturers]);
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  useEffect(() => {
    let result = devices;
    
    // Apply manufacturer filter
    if (selectedManufacturer !== 'All') {
      result = result.filter(device => 
        device.manufacturer === selectedManufacturer
      );
    }
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(device => 
        device.fullName.toLowerCase().includes(term) ||
        device.codename.toLowerCase().includes(term) ||
        device.maintainer.toLowerCase().includes(term)
      );
    }
    
    setFilteredDevices(result);
  }, [devices, selectedManufacturer, searchTerm]);

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  const openChangelog = (url) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="devices-loading">
        <div className="devices-spinner"></div>
        <p>Loading devices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="devices-error">
        <h2>Error loading devices</h2>
        <p>{error}</p>
        <p>Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="devices-container">
      <h1 className="devices-title">Supported Devices</h1>
      
      <div className="devices-controls">
        <div className="devices-search">
          <input
            type="text"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="devices-search-icon">🔍</i>
        </div>
        
        <div className="devices-filters">
          {manufacturers.map(manufacturer => (
            <button
              key={manufacturer}
              className={`devices-filter-btn ${selectedManufacturer === manufacturer ? 'active' : ''}`}
              onClick={() => setSelectedManufacturer(manufacturer)}
            >
              {manufacturer}
            </button>
          ))}
        </div>
      </div>
      
      {filteredDevices.length === 0 ? (
        <div className="devices-empty">
          <p>No devices found. Try changing your search or filter.</p>
        </div>
      ) : (
        <div className="devices-grid">
          {filteredDevices.map(device => (
            <div key={device.id} className="devices-card">
              <div className="devices-card-image-container">
                <img 
                  src={device.imageUrl} 
                  alt={device.fullName}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/img/devices/default.png';
                  }}
                />
              </div>
              <div className="devices-card-content">
                <h3>{device.fullName}</h3>
                <p className="devices-codename">{device.codename}</p>
                <p className="devices-maintainer">
                  Maintainer:&nbsp;
                  <a 
                    href={`https://github.com/${device.maintainer}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {device.maintainer}
                  </a>
                </p>
                <div className="devices-status">
                  <span className={`devices-status-badge ${device.buildInfo.romtype.toLowerCase()}`}>
                    {device.buildInfo.romtype}
                  </span>
                </div>
                <button 
                  className="devices-view-btn"
                  onClick={() => setSelectedDevice(device)}
                >
                  View Build
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedDevice && (
        <div className="devices-modal">
          <div className="devices-modal-content">
            <button 
              className="devices-modal-close"
              onClick={() => setSelectedDevice(null)}
            >
              &times;
            </button>
            
            <div className="devices-modal-image-container">
              <img 
                src={selectedDevice.imageUrl} 
                alt={selectedDevice.fullName}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/img/devices/default.png';
                }}
              />
            </div>
            
            <h2>{selectedDevice.fullName}</h2>
            <p className="devices-modal-codename">Codename: {selectedDevice.codename}</p>
            
            <div className="devices-modal-details">
              <div className="devices-modal-detail">
                <span>Version:</span>
                <span>{selectedDevice.buildInfo.version}</span>
              </div>
              <div className="devices-modal-detail">
                <span>Build Date:</span>
                <span>{formatDate(selectedDevice.buildInfo.datetime)}</span>
              </div>
              <div className="devices-modal-detail">
                <span>File Name:</span>
                <span>{selectedDevice.buildInfo.filename}</span>
              </div>
              <div className="devices-modal-detail">
                <span>Size:</span>
                <span>{formatSize(selectedDevice.buildInfo.size)}</span>
              </div>
              <div className="devices-modal-detail">
                <span>Status:</span>
                <span className={`devices-status-badge ${selectedDevice.buildInfo.romtype.toLowerCase()}`}>
                  {selectedDevice.buildInfo.romtype}
                </span>
              </div>
              <div className="devices-modal-detail">
                <span>Maintainer:</span>
                <a 
                  href={`https://github.com/${selectedDevice.maintainer}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {selectedDevice.maintainer}
                </a>
              </div>
            </div>
            
            <div className="devices-modal-actions">
              <a
                href={selectedDevice.buildInfo.url}
                className="devices-download-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Build
              </a>
              <button
                className="devices-changelog-btn"
                onClick={() => openChangelog(selectedDevice.changelogUrl)}
              >
                View Changelog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevicesPage;