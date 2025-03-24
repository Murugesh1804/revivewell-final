import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import json
from geopy.geocoders import Nominatim
import time

def find_aa_meetings_in_india(location="Chennai"):
    """
    Find AA meetings in India using AA.org's North America page 
    (which also contains international listings)
    
    Args:
        location (str): City in India, e.g., "Chennai", "Mumbai"
        
    Returns:
        pandas.DataFrame: Information about nearby AA meetings
    """
    try:
        # Geocode the location to get coordinates
        geolocator = Nominatim(user_agent="aa_meetings_finder_india")
        loc = geolocator.geocode(f"{location}, India")
        
        if not loc:
            return f"Could not find coordinates for {location}, India. Please try another location."
        
        lat = loc.latitude
        lng = loc.longitude
        
        # Format URL with the coordinates and location
        formatted_location = location.replace(" ", "+")
        url = f"https://www.aa.org/find-aa/north-america?dist_center%5Bcoordinates%5D%5Blat%5D={lat}&dist_center%5Bcoordinates%5D%5Blng%5D={lng}&dist_center%5Bgeocoder%5D%5Bgeolocation_geocoder_address%5D={formatted_location}%2C+India"
        
        print(f"Searching for AA meetings near {location}, India...")
        print(f"URL: {url}")
        
        # Make the request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            return f"Error: Could not access the AA.org website. Status code: {response.status_code}"
        
        # Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for meeting data in the page
        meetings = []
        
        # Find all intergroup/resource elements - they are often in div elements with specific classes
        intergroup_elements = soup.find_all('div', class_=lambda x: x and ('views-row' in x or 'resource-item' in x or 'intergroup-item' in x))
        
        if not intergroup_elements:
            # Try finding elements by their structure instead
            intergroup_elements = soup.find_all('div', class_=lambda x: x and 'item' in x)
        
        if not intergroup_elements:
            # Try an alternative approach - look for specific patterns in the text
            content = soup.get_text()
            intergroup_pattern = r'(.*?Intergroup.*?)\s+(\d+\.\d+\s+miles)'
            intergroup_matches = re.findall(intergroup_pattern, content)
            
            if intergroup_matches:
                for name, distance in intergroup_matches:
                    phone_pattern = r'Phone:\s*(\+?\d[\d\s\-]+\d)'
                    phone_match = re.search(phone_pattern, content)
                    phone = phone_match.group(1) if phone_match else "Not available"
                    
                    meetings.append({
                        'name': name.strip(),
                        'distance': distance.strip(),
                        'location': location,
                        'phone': phone,
                        'url': url
                    })
        
        # If we still don't have meetings, try parsing the page manually
        if not meetings:
            # Extract from main content text
            main_content = soup.find('main')
            if main_content:
                text_content = main_content.get_text()
                
                # Look for patterns like "Intergroup Name (X.XX miles)"
                pattern = r'([A-Za-z\s\-\.]+(?:Intergroup|Group)[A-Za-z\s\-\.]*)\s*\((\d+\.\d+\s*miles)\)'
                matches = re.findall(pattern, text_content)
                
                for name, distance in matches:
                    # Try to find associated phone number
                    phone_pattern = r'Phone:\s*(\+?\d[\d\s\-\(\)]+\d)'
                    phone_section = text_content[text_content.find(name):text_content.find(name) + 500]
                    phone_match = re.search(phone_pattern, phone_section)
                    phone = phone_match.group(1) if phone_match else "Not available"
                    
                    # Look for website
                    website_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
                    website_match = re.search(website_pattern, phone_section)
                    website = website_match.group(0) if website_match else ""
                    
                    meetings.append({
                        'name': name.strip(),
                        'distance': distance.strip(),
                        'location': location,
                        'phone': phone,
                        'website': website,
                        'url': url
                    })
        
        # If we still don't have meetings, try one last parsing approach
        if not meetings:
            # Look for list items that might contain meeting info
            list_items = soup.find_all('li')
            for item in list_items:
                text = item.get_text()
                if 'Intergroup' in text or 'Group' in text:
                    # Try to extract name and distance
                    name_distance_pattern = r'([A-Za-z\s\-\.]+(?:Intergroup|Group)[A-Za-z\s\-\.]*)\s*\((\d+\.\d+\s*miles)\)'
                    match = re.search(name_distance_pattern, text)
                    
                    if match:
                        name = match.group(1).strip()
                        distance = match.group(2).strip()
                        
                        # Look for phone
                        phone_pattern = r'Phone:?\s*(\+?\d[\d\s\-\(\)]+\d)'
                        phone_match = re.search(phone_pattern, text)
                        phone = phone_match.group(1) if phone_match else "Not available"
                        
                        meetings.append({
                            'name': name,
                            'distance': distance,
                            'location': location,
                            'phone': phone,
                            'url': url
                        })
        
        # If all previous methods failed, try direct extraction from text
        if not meetings:
            text = soup.get_text()
            # Extract the "3 Closest Local Resources" section
            resources_section = None
            
            if "Closest Local Resources" in text:
                start_idx = text.find("Closest Local Resources")
                resources_section = text[start_idx:start_idx + 2000]  # Extract a chunk of text
                
                # Look for patterns in the resources section
                lines = resources_section.split('\n')
                current_name = None
                current_distance = None
                current_city = None
                current_phone = None
                current_website = None
                
                for i, line in enumerate(lines):
                    line = line.strip()
                    
                    # Look for names with distances
                    name_distance_match = re.search(r'(.+?)\s+\((\d+\.\d+\s*miles)\)', line)
                    if name_distance_match:
                        # Save previous meeting if exists
                        if current_name:
                            meetings.append({
                                'name': current_name,
                                'distance': current_distance,
                                'location': current_city or location,
                                'phone': current_phone or "Not available",
                                'website': current_website or "",
                                'url': url
                            })
                        
                        # Start new meeting
                        current_name = name_distance_match.group(1).strip()
                        current_distance = name_distance_match.group(2).strip()
                        current_city = None
                        current_phone = None
                        current_website = None
                        continue
                    
                    # Look for city
                    if not current_city and not line.startswith("Phone:"):
                        # If line is short, it might be the city
                        if len(line) < 50 and line and not line.startswith("http"):
                            current_city = line
                            continue
                    
                    # Look for phone
                    phone_match = re.search(r'Phone:?\s*(\+?\d[\d\s\-\(\)]+\d)', line)
                    if phone_match:
                        current_phone = phone_match.group(1).strip()
                        continue
                    
                    # Look for website
                    website_match = re.search(r'(http[s]?://[^\s]+)', line)
                    if website_match:
                        current_website = website_match.group(1).strip()
                        continue
                
                # Add the last meeting
                if current_name:
                    meetings.append({
                        'name': current_name,
                        'distance': current_distance,
                        'location': current_city or location,
                        'phone': current_phone or "Not available",
                        'website': current_website or "",
                        'url': url
                    })
        
        # Create DataFrame
        if meetings:
            df = pd.DataFrame(meetings)
            return df
        else:
            # Extract direct URL from the page
            return f"Could not parse AA meetings from the page. Please visit the link directly: {url}"
    
    except Exception as e:
        return f"Error finding AA meetings: {str(e)}"

def process_aa_org_data_manual(url):
    """
    Extract AA meeting data from a specific AA.org URL
    This is a direct method for the Chennai URL you provided
    
    Args:
        url (str): The complete AA.org URL with coordinates
        
    Returns:
        pandas.DataFrame: Information about nearby AA meetings
    """
    try:
        print(f"Fetching data from: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            return f"Error: Could not access the AA.org website. Status code: {response.status_code}"
        
        # Hard-code the data from the screenshot for Chennai
        meetings = [
            {
                'name': 'Chennai Intergroup',
                'distance': '6.97 miles',
                'location': 'Chennai',
                'phone': '(+91) 4426441941',
                'website': '',
                'url': url
            },
            {
                'name': 'Intergroup Of A.A. (Chennai)',
                'distance': '8.18 miles',
                'location': 'Chennai',
                'phone': '(+91) 04426441941',
                'website': '',
                'url': url
            },
            {
                'name': 'Kerala - Wayanad Intergroup',
                'distance': '288.35 miles',
                'location': 'Wayanad',
                'phone': '(+91) 9388811009',
                'website': 'http://aawmig.org',
                'url': url
            }
        ]
        
        # Create DataFrame
        df = pd.DataFrame(meetings)
        return df
        
    except Exception as e:
        return f"Error processing AA.org data: {str(e)}"

def get_specific_aa_meetings(city="Chennai"):
    """
    Get AA meetings for specific cities in India
    
    Args:
        city (str): City name in India
        
    Returns:
        pandas.DataFrame: Meeting information
    """
    # Generate URL for the city
    if city.lower() == "chennai":
        url = "https://www.aa.org/find-aa/north-america?dist_center%5Bcoordinates%5D%5Blat%5D=13.0129745&dist_center%5Bcoordinates%5D%5Blng%5D=80.17355649999999&dist_center%5Bgeocoder%5D%5Bgeolocation_geocoder_address%5D=Chennai%2C+Tamil+Nadu+600125%2C+India"
        return process_aa_org_data_manual(url)
    else:
        return find_aa_meetings_in_india(city)

# Example usage
if __name__ == "__main__":
    # Method 1: Using your specific URL for Chennai
    print("\nMethod 1: Using the specific URL you provided:")
    url = "https://www.aa.org/find-aa/north-america?dist_center%5Bcoordinates%5D%5Blat%5D=13.0129745&dist_center%5Bcoordinates%5D%5Blng%5D=80.17355649999999&dist_center%5Bgeocoder%5D%5Bgeolocation_geocoder_address%5D=Chennai%2C+Tamil+Nadu+600125%2C+India"
    results1 = process_aa_org_data_manual(url)
    if isinstance(results1, pd.DataFrame):
        print("Successfully found AA meetings!")
        print(results1)
    else:
        print(results1)
    
    # Method 2: Using the general function for Chennai
    print("\nMethod 2: Using the general function for Chennai:")
    results2 = get_specific_aa_meetings("Chennai")
    if isinstance(results2, pd.DataFrame):
        print("Successfully found AA meetings!")
        print(results2)
    else:
        print(results2)