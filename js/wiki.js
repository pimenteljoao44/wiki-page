class WikiSystem {
  constructor() {
    this.apiBaseUrl = "https://wiki-api.ddns.net";
    this.pageToDelete = null;
    this.currentSection = 'introducao';
    this.editMode = false;
    this.content = {};
    this.searchIndex = [];

    this.init();
  }

  init() {
    this.loadContent();
    this.setupEventListeners();
    this.setupSearch();
    this.generateTOC();
    this.highlightCode();
  }

  setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.performSearch(e.target.value);
    });

    window.addEventListener('scroll', () => {
      this.updateTOC();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeEditModal();
      }
    });

    const deleteOption = document.getElementById('deleteOption');
    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const closeDeleteModal = document.getElementById('closeDeleteModal');

    deleteOption.addEventListener('click', () => {
        if (this.pageToDelete) {
            document.getElementById('sectionToDeleteName').textContent = this.pageToDelete.title;
            confirmDeleteModal.style.display = 'block';
        }
    });

    const closeModal = () => confirmDeleteModal.style.display = 'none';
    cancelDeleteBtn.addEventListener('click', closeModal);
    closeDeleteModal.addEventListener('click', closeModal);

    confirmDeleteBtn.addEventListener('click', () => {
        this.deletePage();
    });
  }

  setupNavEventListeners() {
    const navLinks = document.querySelectorAll('.nav-link');
    const contextMenu = document.getElementById('contextMenu');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('href').substring(1);
            this.navigateToSection(section);
        });

        link.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Impede o menu padrão do navegador
            
            const key = link.getAttribute('href').substring(1);
            const pageData = this.content[key];

            this.pageToDelete = { id: pageData.id, key: pageData.key, title: pageData.title };

            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.display = 'block';
        });
    });

    window.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });
}

  async loadContent() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/wiki-pages`);
      if (!response.ok) {
        throw new Error(`Deu erro aqui bixo! status: ${response.status}`);
      }
      const pages = await response.json();

      this.content = {};
      const navList = document.getElementById("navList");
      navList.innerHTML = "";

      pages.forEach(page => {
        this.content[page.key] = page;
        const listItem = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${page.key}`;
        link.classList.add("nav-link");
        link.textContent = page.title;
        listItem.appendChild(link);
        navList.appendChild(listItem);
      });

      this.setupNavEventListeners();

      const initialSection = window.location.hash ? window.location.hash.substring(1) : Object.keys(this.content)[0];
      if (initialSection) {
        this.navigateToSection(initialSection);
      }

    } catch (error) {
      console.error("Erro ao carregar conteúdo da merda da API:", error);
      document.getElementById("content").innerHTML = "<p>Erro ao carregar conteúdo da wiki, resolve aí pit.</p>";
    }
  }


  async navigateToSection(sectionKey) {
    if (!sectionKey) return;

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/wiki-pages/key/${sectionKey}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const page = await response.json();

      this.currentSection = page.key;
      document.getElementById("content").innerHTML = marked.parse(page.content);
      document.getElementById("pageTitle").textContent = page.title;
      document.getElementById("breadcrumb").textContent = `Home > ${page.title}`;
      this.generateTOC();
      this.highlightCode();
      window.location.hash = sectionKey;

      const editButton = document.getElementById("editButton");
      if (editButton) {
        editButton.dataset.pageId = page.id;
        editButton.dataset.pageKey = page.key;
        editButton.dataset.pageTitle = page.title;
        editButton.dataset.pageContent = page.content;
      }

    } catch (error) {
      console.error("Erro ao navegar para a seção:", error);
      document.getElementById("content").innerHTML = `<p>Erro ao carregar a página '${sectionKey}'.</p>`;
      document.getElementById("pageTitle").textContent = "Página Não Encontrada";
      document.getElementById("breadcrumb").textContent = `Home > Página Não Encontrada`;
    }
  }


  renderContent(section) {
    const contentArea = document.getElementById('content');
    const sectionData = this.content[section];

    contentArea.innerHTML = '<div class="loading">Carregando conteúdo...</div>';

    setTimeout(() => {
      const htmlContent = marked.parse(sectionData.content);
      contentArea.innerHTML = htmlContent;

      this.highlightCode();

      this.generateTOC();

      this.setupInternalLinks();
    }, 300);
  }

  highlightCode() {
    Prism.highlightAll();
  }

  generateTOC() {
    const tocList = document.getElementById('tocList');
    const headings = document.querySelectorAll('.content-area h2, .content-area h3, .content-area h4');

    tocList.innerHTML = '';

    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${id}`;
      a.textContent = heading.textContent;
      a.className = heading.tagName.toLowerCase();

      a.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth' });
      });

      li.appendChild(a);
      tocList.appendChild(li);
    });
  }

  setupInternalLinks() {
    const links = document.querySelectorAll('.content-area a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('href').substring(1);
        if (this.content[section]) {
          this.navigateToSection(section);
        }
      });
    });
  }

  updateTOC() {
    const tocLinks = document.querySelectorAll('.toc a');
    const headings = document.querySelectorAll('.content-area h2, .content-area h3, .content-area h4');

    let activeHeading = null;

    headings.forEach(heading => {
      const rect = heading.getBoundingClientRect();
      if (rect.top <= 100 && rect.bottom >= 0) {
        activeHeading = heading;
      }
    });

    tocLinks.forEach(link => {
      link.classList.remove('active');
    });

    if (activeHeading) {
      const activeLink = document.querySelector(`.toc a[href="#${activeHeading.id}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
      }
    }
  }

  setupSearch() {
    this.buildSearchIndex();

    const searchInput = document.getElementById('searchInput');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.performSearch(e.target.value);
      }, 300);
    });
  }

  buildSearchIndex() {
    this.searchIndex = [];

    Object.keys(this.content).forEach(section => {
      const data = this.content[section];
      const text = data.content.toLowerCase();

      this.searchIndex.push({
        section,
        title: data.title,
        content: text,
        keywords: text.split(/\s+/).filter(word => word.length > 3)
      });
    });
  }

  performSearch(query) {
    if (!query || query.length < 3) {
      this.hideSearchResults();
      return;
    }

    const results = this.searchIndex.filter(item => {
      return item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.content.includes(query.toLowerCase()) ||
        item.keywords.some(keyword => keyword.includes(query.toLowerCase()));
    });

    this.showSearchResults(results, query);
  }

  showSearchResults(results, query) {
    console.log('Resultados da busca:', results);
  }

  hideSearchResults() {
    //fazer depois
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    const btn = document.querySelector('.btn-edit');

    if (this.editMode) {
      btn.innerHTML = '<i class="fas fa-eye"></i> Visualizar';
      btn.classList.add('active');
    } else {
      btn.innerHTML = '<i class="fas fa-edit"></i> Editar';
      btn.classList.remove('active');
    }
  }

  editSection() {
    const modal = document.getElementById('editModal');
    const textarea = document.getElementById('editTextarea');

    textarea.value = this.content[this.currentSection].content;
    modal.style.display = 'block';
  }

  closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
  }

  async saveEdit() {
    const textarea = document.getElementById('editTextarea');
    const newContent = textarea.value;
    const pageToUpdate = this.content[this.currentSection];

    const updateDTO = {
        key: pageToUpdate.key,
        title: pageToUpdate.title,
        content: newContent
    };

    const saveButton = document.querySelector('#editModal .btn-primary');
    const originalButtonText = saveButton.innerHTML;
    
    try {
        saveButton.disabled = true;
        saveButton.innerHTML = 'Salvando...';

        const response = await fetch(`${this.apiBaseUrl}/api/wiki-pages/${pageToUpdate.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateDTO),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Erro ao salvar! Status: ${response.status}` }));
            throw new Error(errorData.message || 'Ocorreu um erro desconhecido.');
        }

        const updatedPage = await response.json();

        this.content[this.currentSection] = updatedPage;

        document.getElementById("content").innerHTML = marked.parse(updatedPage.content);
        this.highlightCode();
        this.generateTOC();

        this.closeEditModal();
        this.showNotification('Página salva com sucesso no servidor!', 'success');

    } catch (error) {
        console.error("Falha ao salvar a página:", error);
        this.showNotification(`Erro ao salvar: ${error.message}`, 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = originalButtonText;
    }
}

  async addSection() {
    const sectionName = prompt('Nome da nova seção:');
    if (!sectionName || sectionName.trim() === '') {
      return; 
    }

    const newPageDTO = {
      key: sectionName.toLowerCase().replace(/\s+/g, '-'),
      title: sectionName.trim(),
      content: `# ${sectionName.trim()}\n\nEscreva aqui o conteúdo inicial da sua nova página.`
    };

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/wiki-pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPageDTO),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData ? errorData.message : `Erro ao criar a página! Status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const createdPage = await response.json();

      this.showNotification(`Página "${createdPage.title}" criada com sucesso!`, 'success');


      await this.loadContent();
      this.navigateToSection(createdPage.key);

    } catch (error) {
      console.error("Falha ao criar a seção:", error);
      this.showNotification(error.message, 'error');
    }
  }

  async deletePage() {
        if (!this.pageToDelete) return;

        const { id, title } = this.pageToDelete;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/wiki-pages/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`Erro ao excluir a página! Status: ${response.status}`);
            }

            this.showNotification(`Página "${title}" excluída com sucesso!`, 'success');
            document.getElementById('confirmDeleteModal').style.display = 'none';
            this.pageToDelete = null;

            // Recarrega o menu de navegação e vai para a página inicial
            await this.loadContent();

        } catch (error) {
            console.error("Falha ao excluir a página:", error);
            this.showNotification(error.message, 'error');
            document.getElementById('confirmDeleteModal').style.display = 'none';
        }
    }

  exportPage() {
    const content = this.content[this.currentSection];
    const blob = new Blob([content.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentSection}.md`;
    a.click();

    URL.revokeObjectURL(url);
    this.showNotification('Página exportada!', 'success');
  }

  showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  insertMarkdown(before, after) {
    const textarea = document.getElementById('editTextarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    const newText = before + selectedText + after;
    textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);

    const newCursorPos = start + before.length + selectedText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.wiki = new WikiSystem();
});

function toggleEditMode() {
  window.wiki.toggleEditMode();
}

function editSection() {
  window.wiki.editSection();
}

function addSection() {
  window.wiki.addSection();
}

function exportPage() {
  window.wiki.exportPage();
}

function closeEditModal() {
  window.wiki.closeEditModal();
}

function saveEdit() {
  window.wiki.saveEdit();
}

function insertMarkdown(before, after) {
  window.wiki.insertMarkdown(before, after);
}

function triggerImageUpload() {
    document.getElementById('imageUploadInput').click();
}

async function uploadImage(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const formData = new FormData();
    formData.append('image', file);
    
    wiki.showNotification('A fazer upload da imagem...', 'info');

    try {
        const response = await fetch(`${wiki.apiBaseUrl}/api/images/upload`, {
            method: 'POST',
            body: formData, 
        });

        if (!response.ok) {
            throw new Error('Falha no upload da imagem.');
        }

        const imageUrl = await response.text();

        const markdownToInsert = `\n![Descrição da imagem](${imageUrl})\n`;
        wiki.insertMarkdown('', markdownToInsert); 
        wiki.showNotification('Imagem inserida com sucesso!', 'success');

    } catch (error) {
        console.error('Erro no upload:', error);
        wiki.showNotification(error.message, 'error');
    }
}




