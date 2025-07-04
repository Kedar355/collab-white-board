export class MediaService {
  static getYouTubeEmbedUrl(url: string): string {
    const videoId = this.extractYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  }

  static extractYouTubeVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  static getFigmaEmbedUrl(url: string): string {
    // Convert Figma file URL to embed URL
    const figmaRegex = /figma\.com\/file\/([a-zA-Z0-9]+)/;
    const match = url.match(figmaRegex);
    if (match) {
      return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
    }
    return '';
  }

  static getGitHubGistEmbedUrl(url: string): string {
    // Convert GitHub Gist URL to embed URL
    const gistRegex = /gist\.github\.com\/([^\/]+)\/([a-zA-Z0-9]+)/;
    const match = url.match(gistRegex);
    if (match) {
      return `https://gist.github.com/${match[1]}/${match[2]}.js`;
    }
    return '';
  }

  static async getUrlMetadata(url: string): Promise<{ title?: string; thumbnail?: string; description?: string }> {
    try {
      // This would typically be done server-side to avoid CORS issues
      const response = await fetch(`/api/url-metadata?url=${encodeURIComponent(url)}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching URL metadata:', error);
      return {};
    }
  }

  static isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  static getMediaType(url: string): 'youtube' | 'pdf' | 'image' | 'webpage' | 'figma' | 'github-gist' | 'google-docs' {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('figma.com')) return 'figma';
    if (url.includes('gist.github.com')) return 'github-gist';
    if (url.includes('docs.google.com')) return 'google-docs';
    if (url.endsWith('.pdf')) return 'pdf';
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    return 'webpage';
  }
}