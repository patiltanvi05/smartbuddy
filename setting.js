  (function(){
    const LS_THEME = 'sbb_theme';
    const LS_PERSONAL = 'sbb_personal';

    const btnLight = document.getElementById('btnLight');
    const btnDark = document.getElementById('btnDark');
    const body = document.body;

    // init theme from storage
    function applyTheme(theme){
      if (theme === 'dark') {
        body.classList.add('theme-dark');
        btnDark.classList.add('active','dark');
        btnLight.classList.remove('active','light');
        btnDark.setAttribute('aria-pressed','true');
        btnLight.setAttribute('aria-pressed','false');
      } else {
        body.classList.remove('theme-dark');
        btnLight.classList.add('active','light');
        btnDark.classList.remove('active','dark');
        btnLight.setAttribute('aria-pressed','true');
        btnDark.setAttribute('aria-pressed','false');
      }
      try { localStorage.setItem(LS_THEME, theme); } catch(e){}
    }

    const storedTheme = (localStorage.getItem(LS_THEME) || 'light');
    applyTheme(storedTheme);

    btnLight.addEventListener('click', ()=> applyTheme('light'));
    btnDark.addEventListener('click', ()=> applyTheme('dark'));

    // Personal form load/save
    const personalForm = document.getElementById('personalForm');
    const saveToast = document.getElementById('saveToast');

    function loadPersonal(){
      try {
        const p = JSON.parse(localStorage.getItem(LS_PERSONAL) || '{}');
        if (p.username) document.getElementById('username').value = p.username;
        if (p.email) document.getElementById('email').value = p.email;
        if (p.phone) document.getElementById('phone').value = p.phone;
        // do not prefill password for security
      } catch(e){}
    }

    function showToast(){
      saveToast.style.display = 'block';
      saveToast.style.opacity = '1';
      setTimeout(()=> {
        saveToast.style.transition = 'opacity 350ms ease';
        saveToast.style.opacity = '0';
        setTimeout(()=> saveToast.style.display = 'none', 380);
      }, 3000);
    }

    personalForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const payload = {
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim()
      };
      try { localStorage.setItem(LS_PERSONAL, JSON.stringify(payload)); } catch(e){}
      // simulate save and show popup
      showToast();
    });

    loadPersonal();

    // keep header icon behaviors (open transaction, dropdown toggles)
    const addBtn = document.querySelector('.add');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('transaction.html', '_blank', 'noopener');
      });
    }

    const menuIcon = document.querySelector('.menu');
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (menuIcon && dropdownMenu) {
      menuIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.style.display =
          dropdownMenu.style.display === 'block' ? 'none' : 'block';
      });
    }
    window.addEventListener('click', (e) => {
      if (menuIcon && dropdownMenu) {
        if (!menuIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
          dropdownMenu.style.display = 'none';
        }
      }
    });
    if (dropdownMenu) dropdownMenu.addEventListener('click', (e)=> e.stopPropagation());
  })();