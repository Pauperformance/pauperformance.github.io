(function() {
  
  const excludeFiterClass = "excludeFilter";
  const colorTranslation = { blue: "U.png", black: "B.png", green: "G.png", colorless: "C.png", red: "R.png", white: "W.png" };

  class PpfArchetypesFilter extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        mana: {
          blue: true,
          red: true,
          green: true,
          black: true,
          white: true,
          colorless: true
        },
        name: "",
        type: "",
        family: "",
      };
      const tbl = this.getTargetTable();
      if (!tbl) {
        throw ReferenceError(`Document has no element with id ${this.props.target}`);
      }
      if (tbl.tagName != "TABLE") {
        throw ReferenceError(`Document element with id ${this.props.target} is not a table`);
      }
    }

    componentDidCatch(err, errInfo) {
      console.log("Preso!");
    }

    getTargetTable() {
      return document.getElementById(this.props.target);
    }

    updateManaFilter(params) {
      if (!params) {
        return;
      }
      this.setState(prevState => { 
        const newState = {...prevState};
        if (params.hasOwnProperty('color')) {
          newState.mana[params.color] = !this.state.mana[params.color];
        }
        if (params.hasOwnProperty('name')) {
          newState.name = params.name;
        }
        if (params.hasOwnProperty('type')) {
          newState.type = params.type;
        }
        if (params.hasOwnProperty('family')) {
          newState.family = params.family;
        }
        return newState;
      }, () => this.filterRows(params));
    }

    filterRows() {
      try {
        const hideClass = "hide";
        Array.from(this.getTargetTable().rows)
          .forEach((row, idx) => {
            if (idx < 2) {
              return;
            }
            if (this.hasName(row) && this.hasMana(row) 
                  && this.hasType(row) && this.hasFamily(row)) {
              row.classList.remove(hideClass);
            } else {
              row.classList.add(hideClass);
            }
          });
      } catch (err) {
        console.log(err);
      }
    }

    hasMana(row) {
      let selectedManas = "";
      for (const color in this.state.mana) {
        if (Object.hasOwnProperty.call(this.state.mana, color) && this.state.mana[color]) {
          selectedManas += colorTranslation[color];
        }
      }
      return Array.from(row.cells[1].children)
        .filter(img => {
          const src = img.getAttribute("src");
          const mana = src.substring(src.length - 5);
          return selectedManas.search(mana) > -1;
        }).length > 0;
    }

    hasName(row) {
      if (!this.state.name) {
        return true;
      }
      let name = row.cells[0].querySelector("a").textContent;
      return name && name.toLowerCase().includes(this.state.name);
    }

    hasType(row) {
      if (!this.state.type) {
        return true;
      }
      let type = row.cells[2].textContent;
      return type && type.toLowerCase().includes(this.state.type);
    }

    hasFamily(row) {
      if (!this.state.family) {
        return true;
      }
      let fam = row.cells[3].querySelector("a").textContent;
      return fam && fam.toLowerCase().includes(this.state.family);
    }

    makeManaButton(color) {
      const darkenedClass = "darkened";
      const imgStyle = { marginRight: '4px' };
      const png = `/resources/images/mana/${colorTranslation[color]}`;
      return (
        <span style={imgStyle} className={ !this.state.mana[color] ? darkenedClass : "" }
              onClick={(evt) => this.updateManaFilter({ color: color })}>
          <img src={png} className="dominant-mana-icon" />
        </span>
      );
    }

    render() {
      const filterRowHtml = (
        <tr className={excludeFiterClass}>
          <td>
            <input type="text" name="archetypeName" value={this.state.name} 
              onChange={(e)=>{this.updateManaFilter({name: e.target.value})}} />
          </td>
          <td>
            {this.makeManaButton("blue")}
            {this.makeManaButton("black")}
            {this.makeManaButton("white")}
            {this.makeManaButton("green")}
            {this.makeManaButton("red")}
            {this.makeManaButton("colorless")}
          </td>
          <td>
            <input type="text" name="archetypeType" value={this.state.type} 
              onChange={(e)=>{this.updateManaFilter({type: e.target.value})}} />
          </td>
          <td>
            <input type="text" name="archetypeFamily" value={this.state.family}
              onChange={(e)=>{this.updateManaFilter({family: e.target.value})}} />
          </td>
        </tr>
      );

      return ReactDOM.createPortal(
        filterRowHtml,
        this.getTargetTable().querySelector('thead')
      );
    }
  }

  const domContainer = document.querySelector('#archetypes-filter-anchor');
  const root = ReactDOM.createRoot(domContainer);
  root.render(React.createElement(PpfArchetypesFilter, { target: 'archetypes-table' }));
})();
