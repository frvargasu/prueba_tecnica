
app movil con Ionic + Angular + Capacitor que usa la API de Open Library. tiene soporte offline con SQLite.

## 

- 4 generos literarios (ficcion, misterio, ciencia ficcion, romance)
- listado de libros con scroll infinito
- buscador con debounce
- detalle de libro (portada, autor, descripcion, fecha)
- listas personalizadas (maximo 3)
- funciona offline

## instalacion

```bash
cd open-library-app
npm install

# desarrollo web
ionic serve



## decisiones tecnicas

### arquitectura
- **standalone components**: uso de angular 18 sin modules, cada componente es independiente
- **lazy loading**: cada pagina se carga solo cuando se necesita
- **separacion de responsabilidades**: services para logica, pages para UI, models para tipos

### offline
- con internet: trae de la API y guarda en SQLite
- sin internet: lee de SQLite
- si falla la API: usa el cache


### estados de UI
```typescript
enum ViewState {
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  EMPTY = 'empty'
}
```
cada pagina maneja estos 4 estados con componentes reutilizables (loading-state, error-state, empty-state)

### ciclo de vida ionic
- uso de `ionViewWillEnter` en vez de `ngOnInit` para cargar datos
- esto permite recargar datos cuando el usuario vuelve a una pagina

### validaciones listas personalizadas
- maximo 3 listas
- nombre de 2-50 caracteres
- no se pueden repetir nombres
- no se pueden duplicar libros en la misma lista

## limitaciones

- **SQLite en web**: no funciona nativo, se usa localStorage como fallback para desarrollo
- **API Open Library**: a veces es lenta o no responde, se implemento retry con cache
- **portadas**: no todos los libros tienen imagen, se muestra placeholder
- **descripciones**: muchos libros no tienen descripcion en la API
- **busqueda offline**: solo busca en datos que ya se hayan cacheado antes

## estructura

```
src/app/
├── components/          # componentes reutilizables
│   ├── book-card/       # tarjeta de libro
│   ├── loading-state/   # estado cargando
│   ├── empty-state/     # estado vacio
│   ├── error-state/     # estado error
│   └── offline-banner/  # banner sin conexion
│
├── models/              # interfaces y tipos
│   ├── book.model.ts    # libro, autor
│   ├── genre.model.ts   # genero
│   ├── custom-list.model.ts # lista personalizada
│   └── ui-state.model.ts    # estados de vista
│
├── services/            # logica de negocio
│   ├── database.service.ts    # SQLite
│   ├── open-library.service.ts # llamadas a la API
│   ├── network.service.ts     # estado de red
│   └── book.service.ts        # offline-first + listas
│
└── pages/               # pantallas
    ├── home/            # inicio con generos
    ├── genre-books/     # libros por genero
    ├── book-detail/     # detalle del libro
    ├── search/          # buscador
    ├── lists/           # mis listas
    ├── list-detail/     # detalle de lista
    └── list-form/       # crear/editar lista
```

## base de datos

schema en `/database/schema.sql`

| tabla | que guarda |
|-------|------------|
| books | cache de libros |
| authors | autores |
| book_authors | relacion libro-autor |
| genre_books | libros por genero |
| custom_lists | listas del usuario |
| custom_list_books | libros en cada lista |

## api

usa Open Library:
- `/subjects/{subject}.json` - libros por genero
- `/search.json?q={query}` - busqueda
- `/works/{id}.json` - detalle
- portadas: `https://covers.openlibrary.org/b/id/{id}-M.jpg`

## tecnologias

- Ionic 8
- Angular 18
- Capacitor 6
- @capacitor-community/sqlite
- @capacitor/network

## notas

- en web usa localStorage para las listas (SQLite solo funciona en mobile)
- la API de Open Library a veces es lenta
- no todos los libros tienen portada o descripcion

---

